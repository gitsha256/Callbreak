/**
 * Court Piece - Type Definitions for Android
 * Kotlin data classes for 6-Player Team-Based Game
 */

package com.tashpremierleague.courtpiece.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey
import java.time.LocalDateTime

// ============= Enums & Type Aliases =============

enum class TeamId {
    A, B
}

enum class GameMode {
    CALL_BREAK, COURT_PIECE
}

enum class GamePhase {
    SETUP, BIDDING, PLAYING, SETTLEMENT, COMPLETED
}

enum class DefenderScoringMode {
    PER_TRICK, ABSOLUTE
}

// ============= Core Game Models =============

/**
 * Player: Individual participant with team assignment
 */
data class CPPlayer(
    val key: String,
    val name: String,
    val team: TeamId,
    val seatPosition: Int // 0-5 in alternating order
)

/**
 * Bidding: Individual bid made by a player
 */
data class PlayerBid(
    val playerKey: String,
    val bid: Int
)

/**
 * Settlement: Tricks won by each player in a round
 */
data class PlayerSettlement(
    val playerKey: String,
    val tricksWon: Int
)

/**
 * CPRoundData: Complete round information
 */
data class CPRoundData(
    val roundNumber: Int,
    val phase: GamePhase,

    // Bidding phase
    val bids: Map<String, Int?> = emptyMap(), // playerKey -> bid
    val teamACalls: List<Int> = emptyList(),
    val teamBCalls: List<Int> = emptyList(),
    val totalTeamACall: Int? = null,
    val totalTeamBCall: Int? = null,

    // Team role assignment
    val declarerTeam: TeamId? = null,
    val defenderTeam: TeamId? = null,

    // Settlement phase
    val tricksWon: Map<String, Int?> = emptyMap(), // playerKey -> tricks
    val teamATricksWon: Int? = null,
    val teamBTricksWon: Int? = null,

    // Scoring results
    val teamAScore: Int? = null,
    val teamBScore: Int? = null,

    // Metadata
    val timestamp: LocalDateTime = LocalDateTime.now()
)

/**
 * Match Totals: Cumulative scores
 */
data class MatchTotals(
    val teamATotal: Int = 0,
    val teamBTotal: Int = 0,
    val pointsToWin: Int = 52,
    val leaderTeam: TeamId? = null,
    val pointDifferential: Int = 0,
    val matchWinner: TeamId? = null
)

/**
 * Court Piece Game State
 */
data class CPGameState(
    val players: List<CPPlayer>,
    val rounds: List<CPRoundData>,
    val matchTotals: MatchTotals,
    val currentPhase: GamePhase,
    val currentRoundIndex: Int,
    val startTime: LocalDateTime? = null,
    val endTime: LocalDateTime? = null,
    val deckConfiguration: String = "deck48"
)

/**
 * Scoring Configuration
 */
data class CPScoringConfig(
    val allowFractionalOverTricks: Boolean = false,
    val defenderScoringMode: DefenderScoringMode = DefenderScoringMode.PER_TRICK
)

/**
 * Bid Validation Result
 */
data class BidValidationResult(
    val isValid: Boolean,
    val error: String? = null,
    val warning: String? = null,
    val teamACallIfAdded: Int? = null,
    val teamBCallIfAdded: Int? = null
)

/**
 * Round Scoring Result
 */
data class RoundScoringResult(
    val teamAScore: Int,
    val teamBScore: Int,
    val declarerTeam: TeamId,
    val reasons: Map<TeamId, String>,
    val isCoteBonus: Boolean = false
)

// ============= Room Database Entities =============

/**
 * CP Match Entity for database persistence
 */
@Entity(tableName = "cp_matches")
data class CPMatchEntity(
    @PrimaryKey(autoGenerate = true) val matchId: Long = 0,
    val gameMode: String = "COURT_PIECE",
    val teamATotal: Int = 0,
    val teamBTotal: Int = 0,
    val matchWinner: String? = null,
    val startTime: LocalDateTime = LocalDateTime.now(),
    val endTime: LocalDateTime? = null,
    val deckConfiguration: String = "deck48",
    val isCompleted: Boolean = false
)

/**
 * CP Round Entity for database persistence
 */
@Entity(
    tableName = "cp_rounds",
    foreignKeys = [
        ForeignKey(
            entity = CPMatchEntity::class,
            parentColumns = ["matchId"],
            childColumns = ["matchId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class CPRoundEntity(
    @PrimaryKey(autoGenerate = true) val roundId: Long = 0,
    val matchId: Long,
    val roundNumber: Int,
    val phase: String,

    // Bidding results
    val teamACall: Int?,
    val teamBCall: Int?,
    val declarerTeam: String?,

    // Settlement results
    val teamATricksWon: Int?,
    val teamBTricksWon: Int?,

    // Scores
    val teamAScore: Int?,
    val teamBScore: Int?,

    // Metadata
    val timestamp: LocalDateTime = LocalDateTime.now()
)

/**
 * CP Player Bid Entity
 */
@Entity(
    tableName = "cp_player_bids",
    foreignKeys = [
        ForeignKey(
            entity = CPRoundEntity::class,
            parentColumns = ["roundId"],
            childColumns = ["roundId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class CPPlayerBidEntity(
    @PrimaryKey(autoGenerate = true) val bidId: Long = 0,
    val roundId: Long,
    val playerKey: String,
    val playerName: String,
    val team: String,
    val bid: Int?
)

/**
 * CP Player Tricks Entity
 */
@Entity(
    tableName = "cp_player_tricks",
    foreignKeys = [
        ForeignKey(
            entity = CPRoundEntity::class,
            parentColumns = ["roundId"],
            childColumns = ["roundId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class CPPlayerTricksEntity(
    @PrimaryKey(autoGenerate = true) val trickId: Long = 0,
    val roundId: Long,
    val playerKey: String,
    val playerName: String,
    val team: String,
    val tricksWon: Int?
)

/**
 * CP Game Players Entity
 */
@Entity(
    tableName = "cp_game_players",
    foreignKeys = [
        ForeignKey(
            entity = CPMatchEntity::class,
            parentColumns = ["matchId"],
            childColumns = ["matchId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class CPGamePlayerEntity(
    @PrimaryKey(autoGenerate = true) val playerId: Long = 0,
    val matchId: Long,
    val playerKey: String,
    val playerName: String,
    val team: String,
    val seatPosition: Int
)

// ============= DAO Response Models (with Relations) =============

data class CPRoundWithDetails(
    val round: CPRoundEntity,
    val playerBids: List<CPPlayerBidEntity> = emptyList(),
    val playerTricks: List<CPPlayerTricksEntity> = emptyList()
)

data class CPMatchWithRounds(
    val match: CPMatchEntity,
    val players: List<CPGamePlayerEntity> = emptyList(),
    val rounds: List<CPRoundWithDetails> = emptyList()
)

// ============= Helper Functions =============

fun List<CPPlayer>.getTeamPlayers(team: TeamId): List<CPPlayer> {
    return filter { it.team == team }
}

fun TeamId.getOpponent(): TeamId {
    return if (this == TeamId.A) TeamId.B else TeamId.A
}

fun createInitialCPGameState(playerNames: List<String>): CPGameState {
    require(playerNames.size == 6) { "Court Piece requires exactly 6 players" }

    val players = playerNames.mapIndexed { index, name ->
        CPPlayer(
            key = "cp_player$index",
            name = name,
            team = if (index % 2 == 0) TeamId.A else TeamId.B,
            seatPosition = index
        )
    }

    val initialRound = CPRoundData(
        roundNumber = 1,
        phase = GamePhase.BIDDING,
        timestamp = LocalDateTime.now()
    )

    return CPGameState(
        players = players,
        rounds = listOf(initialRound),
        matchTotals = MatchTotals(
            teamATotal = 0,
            teamBTotal = 0,
            pointsToWin = 52
        ),
        currentPhase = GamePhase.BIDDING,
        currentRoundIndex = 0,
        startTime = LocalDateTime.now(),
        deckConfiguration = "deck48"
    )
}
