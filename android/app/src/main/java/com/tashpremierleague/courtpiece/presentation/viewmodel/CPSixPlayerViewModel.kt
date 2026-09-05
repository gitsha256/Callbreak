/**
 * Court Piece Game ViewModel - MVVM Architecture
 * Manages game state, phase transitions, and scoring
 */

package com.tashpremierleague.courtpiece.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.tashpremierleague.courtpiece.data.model.*
import com.tashpremierleague.courtpiece.domain.usecase.CPScoringEngine

/**
 * Game action types for state management
 */
sealed class CPGameAction {
    data class Initialize(val playerNames: List<String>) : CPGameAction()
    data class PlaceBid(val playerKey: String, val bid: Int) : CPGameAction()
    object FinalizeBidding : CPGameAction()
    data class RecordTrick(val playerKey: String, val tricksWon: Int) : CPGameAction()
    object FinalizeSettlement : CPGameAction()
    object StartNextRound : CPGameAction()
    data class UpdateScoringConfig(val config: CPScoringConfig) : CPGameAction()
    object ResetGame : CPGameAction()
}

/**
 * UI State container
 */
data class CPGameUIState(
    val gameState: CPGameState = CPGameState(
        players = emptyList(),
        rounds = emptyList(),
        matchTotals = MatchTotals(),
        currentPhase = GamePhase.SETUP,
        currentRoundIndex = 0
    ),
    val scoringConfig: CPScoringConfig = CPScoringConfig(),
    val error: String? = null,
    val loadingState: LoadingState = LoadingState.IDLE,
    val areAllBidsPlaced: Boolean = false,
    val areAllTricksRecorded: Boolean = false,
    val scoreDifferential: String = "Teams tied — 52 pts to reach 52"
)

enum class LoadingState {
    IDLE, SAVING, LOADING
}

/**
 * Court Piece Game ViewModel
 * Handles all game logic and state management
 */
class CPSixPlayerViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(CPGameUIState())
    val uiState: StateFlow<CPGameUIState> = _uiState.asStateFlow()

    /**
     * Process game action
     */
    fun dispatch(action: CPGameAction) {
        viewModelScope.launch {
            try {
                when (action) {
                    is CPGameAction.Initialize -> handleInitialize(action.playerNames)
                    is CPGameAction.PlaceBid -> handlePlaceBid(action.playerKey, action.bid)
                    CPGameAction.FinalizeBidding -> handleFinalizeBidding()
                    is CPGameAction.RecordTrick -> handleRecordTrick(action.playerKey, action.tricksWon)
                    CPGameAction.FinalizeSettlement -> handleFinalizeSettlement()
                    CPGameAction.StartNextRound -> handleStartNextRound()
                    is CPGameAction.UpdateScoringConfig -> handleUpdateScoringConfig(action.config)
                    CPGameAction.ResetGame -> handleResetGame()
                }
                updateUIState()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    /**
     * Initialize game with player names
     */
    private fun handleInitialize(playerNames: List<String>) {
        if (playerNames.size != 6) {
            throw IllegalArgumentException("Court Piece requires exactly 6 players")
        }

        val gameState = createInitialCPGameState(playerNames)
        _uiState.update { it.copy(gameState = gameState, error = null) }
    }

    /**
     * Place a bid for a player
     */
    private fun handlePlaceBid(playerKey: String, bid: Int) {
        val currentState = _uiState.value.gameState
        val currentRound = currentState.rounds[currentState.currentRoundIndex]
        val player = currentState.players.find { it.key == playerKey }
            ?: throw IllegalArgumentException("Player not found")

        // Validate bid
        val teamPlayers = currentState.players.getTeamPlayers(player.team)
        val otherTeamPlayers = currentState.players.getTeamPlayers(player.team.getOpponent())

        val currentTeamCalls = teamPlayers
            .filter { it.key != playerKey }
            .mapNotNull { currentRound.bids[it.key] }

        val otherTeamCalls = otherTeamPlayers
            .mapNotNull { currentRound.bids[it.key] }

        val validation = CPScoringEngine.validateBid(
            if (player.team == TeamId.A) currentTeamCalls else otherTeamCalls,
            if (player.team == TeamId.B) currentTeamCalls else otherTeamCalls,
            bid,
            player.team
        )

        if (!validation.isValid) {
            throw IllegalArgumentException(validation.error ?: "Invalid bid")
        }

        // Update round with new bid
        val updatedRounds = currentState.rounds.mapIndexed { index, round ->
            if (index == currentState.currentRoundIndex) {
                round.copy(
                    bids = round.bids.toMutableMap().apply { put(playerKey, bid) }
                )
            } else {
                round
            }
        }

        _uiState.update { it.copy(gameState = currentState.copy(rounds = updatedRounds), error = null) }
    }

    /**
     * Finalize bidding phase
     */
    private fun handleFinalizeBidding() {
        val currentState = _uiState.value.gameState
        val currentRound = currentState.rounds[currentState.currentRoundIndex]

        // Validate all bids are placed
        if (currentState.players.any { currentRound.bids[it.key] == null }) {
            throw IllegalStateException("All players must place bids")
        }

        val finalizedRound = CPScoringEngine.finalizeBidding(currentRound, currentState.players)

        val updatedRounds = currentState.rounds.mapIndexed { index, round ->
            if (index == currentState.currentRoundIndex) finalizedRound else round
        }

        _uiState.update {
            it.copy(
                gameState = currentState.copy(
                    rounds = updatedRounds,
                    currentPhase = GamePhase.PLAYING
                ),
                error = null
            )
        }
    }

    /**
     * Record tricks won by a player
     */
    private fun handleRecordTrick(playerKey: String, tricksWon: Int) {
        if (tricksWon < 0 || tricksWon > 8) {
            throw IllegalArgumentException("Tricks won must be between 0 and 8")
        }

        val currentState = _uiState.value.gameState
        val currentRound = currentState.rounds[currentState.currentRoundIndex]

        val updatedRounds = currentState.rounds.mapIndexed { index, round ->
            if (index == currentState.currentRoundIndex) {
                round.copy(
                    tricksWon = round.tricksWon.toMutableMap().apply { put(playerKey, tricksWon) }
                )
            } else {
                round
            }
        }

        _uiState.update { it.copy(gameState = currentState.copy(rounds = updatedRounds), error = null) }
    }

    /**
     * Finalize settlement and calculate scores
     */
    private fun handleFinalizeSettlement() {
        val currentState = _uiState.value.gameState
        val currentRound = currentState.rounds[currentState.currentRoundIndex]

        // Validate all tricks are recorded
        if (currentState.players.any { currentRound.tricksWon[it.key] == null }) {
            throw IllegalStateException("All players must record tricks")
        }

        val finalizedRound = CPScoringEngine.finalizeSettlement(
            currentRound,
            currentState.players,
            _uiState.value.scoringConfig
        )

        // Update match totals
        val newTeamATotal = currentState.matchTotals.teamATotal + (finalizedRound.teamAScore ?: 0)
        val newTeamBTotal = currentState.matchTotals.teamBTotal + (finalizedRound.teamBScore ?: 0)

        val (isComplete, winner) = CPScoringEngine.checkMatchCompletion(newTeamATotal, newTeamBTotal)

        val newMatchTotals = MatchTotals(
            teamATotal = newTeamATotal,
            teamBTotal = newTeamBTotal,
            pointsToWin = 52,
            leaderTeam = when {
                newTeamATotal > newTeamBTotal -> TeamId.A
                newTeamBTotal > newTeamATotal -> TeamId.B
                else -> null
            },
            pointDifferential = kotlin.math.abs(newTeamATotal - newTeamBTotal),
            matchWinner = winner
        )

        val updatedRounds = currentState.rounds.mapIndexed { index, round ->
            if (index == currentState.currentRoundIndex) finalizedRound else round
        }

        val newPhase = if (isComplete) GamePhase.COMPLETED else GamePhase.SETTLEMENT

        _uiState.update {
            it.copy(
                gameState = currentState.copy(
                    rounds = updatedRounds,
                    matchTotals = newMatchTotals,
                    currentPhase = newPhase
                ),
                error = null
            )
        }
    }

    /**
     * Start next round
     */
    private fun handleStartNextRound() {
        val currentState = _uiState.value.gameState

        if (currentState.matchTotals.matchWinner != null) {
            throw IllegalStateException("Cannot start new round: match is complete")
        }

        val currentRound = currentState.rounds[currentState.currentRoundIndex]
        val nextRound = CPScoringEngine.createNextRound(currentRound, currentState.players)

        _uiState.update {
            it.copy(
                gameState = currentState.copy(
                    rounds = currentState.rounds + nextRound,
                    currentRoundIndex = currentState.currentRoundIndex + 1,
                    currentPhase = GamePhase.BIDDING
                ),
                error = null
            )
        }
    }

    /**
     * Update scoring configuration
     */
    private fun handleUpdateScoringConfig(config: CPScoringConfig) {
        _uiState.update { it.copy(scoringConfig = config) }
    }

    /**
     * Reset game
     */
    private fun handleResetGame() {
        val currentState = _uiState.value.gameState
        val playerNames = currentState.players.map { it.name }
        val newGameState = createInitialCPGameState(playerNames)

        _uiState.update { it.copy(gameState = newGameState, error = null) }
    }

    /**
     * Update UI state based on game state
     */
    private fun updateUIState() {
        val gameState = _uiState.value.gameState
        val currentRound = gameState.rounds[gameState.currentRoundIndex]

        val areAllBidsPlaced = when (gameState.currentPhase) {
            GamePhase.BIDDING -> gameState.players.all { currentRound.bids[it.key] != null }
            else -> false
        }

        val areAllTricksRecorded = when (gameState.currentPhase) {
            GamePhase.SETTLEMENT -> gameState.players.all { currentRound.tricksWon[it.key] != null }
            else -> false
        }

        val scoreDifferential = CPScoringEngine.formatScoreDifferential(
            gameState.matchTotals.teamATotal,
            gameState.matchTotals.teamBTotal
        )

        _uiState.update {
            it.copy(
                areAllBidsPlaced = areAllBidsPlaced,
                areAllTricksRecorded = areAllTricksRecorded,
                scoreDifferential = scoreDifferential
            )
        }
    }
}
