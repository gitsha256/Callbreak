/**
 * Court Piece Scoring Engine - Android/Kotlin Implementation
 * Complete rule implementation with all edge cases
 */

package com.tashpremierleague.courtpiece.domain.usecase

import com.tashpremierleague.courtpiece.data.model.*

object CPScoringEngine {

    /**
     * Validate bid against house constraints
     * Team total must be >= 5 and <= 8
     */
    fun validateBid(
        currentTeamACalls: List<Int>,
        currentTeamBCalls: List<Int>,
        newBid: Int,
        bidderTeam: TeamId
    ): BidValidationResult {
        if (newBid < 3 || newBid > 8) {
            return BidValidationResult(
                isValid = false,
                error = "Bid must be between 3 and 8"
            )
        }

        val teamACallIfAdded = if (bidderTeam == TeamId.A) {
            currentTeamACalls.sum() + newBid
        } else {
            currentTeamACalls.sum()
        }

        val teamBCallIfAdded = if (bidderTeam == TeamId.B) {
            currentTeamBCalls.sum() + newBid
        } else {
            currentTeamBCalls.sum()
        }

        // House constraint validation
        if (bidderTeam == TeamId.A && teamACallIfAdded > 8) {
            return BidValidationResult(
                isValid = false,
                error = "Team A total would be $teamACallIfAdded (max 8)",
                teamACallIfAdded = teamACallIfAdded,
                teamBCallIfAdded = teamBCallIfAdded
            )
        }

        if (bidderTeam == TeamId.B && teamBCallIfAdded > 8) {
            return BidValidationResult(
                isValid = false,
                error = "Team B total would be $teamBCallIfAdded (max 8)",
                teamACallIfAdded = teamACallIfAdded,
                teamBCallIfAdded = teamBCallIfAdded
            )
        }

        return BidValidationResult(
            isValid = true,
            teamACallIfAdded = teamACallIfAdded,
            teamBCallIfAdded = teamBCallIfAdded
        )
    }

    /**
     * Calculate final scores for a round after settlement
     */
    fun calculateRoundScores(
        roundData: CPRoundData,
        config: CPScoringConfig = CPScoringConfig()
    ): RoundScoringResult {
        // Validate required data
        require(roundData.totalTeamACall != null) { "Missing Team A total call" }
        require(roundData.totalTeamBCall != null) { "Missing Team B total call" }
        require(roundData.teamATricksWon != null) { "Missing Team A tricks won" }
        require(roundData.teamBTricksWon != null) { "Missing Team B tricks won" }

        // Determine declarer
        val declarerTeam = if (roundData.totalTeamACall >= roundData.totalTeamBCall) {
            TeamId.A
        } else {
            TeamId.B
        }

        val declarerCall = if (declarerTeam == TeamId.A) {
            roundData.totalTeamACall
        } else {
            roundData.totalTeamBCall
        }

        val declarerTricksWon = if (declarerTeam == TeamId.A) {
            roundData.teamATricksWon
        } else {
            roundData.teamBTricksWon
        }

        val defenderTricksWon = if (declarerTeam == TeamId.A) {
            roundData.teamBTricksWon
        } else {
            roundData.teamATricksWon
        }

        var declarerScore: Number
        var isCoteBonus = false
        val reason: String

        // Calculate declarer score
        when {
            declarerTricksWon >= declarerCall -> {
                // Base success
                declarerScore = declarerCall

                // Over-tricks bonus
                if (config.allowFractionalOverTricks && declarerTricksWon > declarerCall) {
                    val overTricks = declarerTricksWon - declarerCall
                    declarerScore = declarerCall + (overTricks * 0.1)
                }

                // Cote / Slam bonus (8 call & 8 tricks won)
                if (declarerCall == 8 && declarerTricksWon == 8) {
                    declarerScore = 16
                    isCoteBonus = true
                }

                reason = "Declarer ${declarerTeam} won $declarerTricksWon/$declarerCall tricks"
            }
            else -> {
                // Bust
                declarerScore = -declarerCall
                reason = "Declarer ${declarerTeam} busted: $declarerTricksWon/$declarerCall tricks"
            }
        }

        // Defender score
        val defenderScore = when (config.defenderScoringMode) {
            DefenderScoringMode.PER_TRICK -> defenderTricksWon
            DefenderScoringMode.ABSOLUTE -> defenderTricksWon
        }

        // Convert to Int if possible
        val declarerScoreInt = if (declarerScore is Double) {
            declarerScore.toInt()
        } else {
            declarerScore as Int
        }

        return RoundScoringResult(
            teamAScore = if (declarerTeam == TeamId.A) declarerScoreInt else defenderScore,
            teamBScore = if (declarerTeam == TeamId.B) declarerScoreInt else defenderScore,
            declarerTeam = declarerTeam,
            reasons = mapOf(
                TeamId.A to if (declarerTeam == TeamId.A) reason else "Defender: $defenderScore tricks",
                TeamId.B to if (declarerTeam == TeamId.B) reason else "Defender: $defenderScore tricks"
            ),
            isCoteBonus = isCoteBonus
        )
    }

    /**
     * Finalize bidding phase
     */
    fun finalizeBidding(
        roundData: CPRoundData,
        players: List<CPPlayer>
    ): CPRoundData {
        val teamAPlayers = players.getTeamPlayers(TeamId.A)
        val teamBPlayers = players.getTeamPlayers(TeamId.B)

        val teamATotal = teamAPlayers.sumOf { roundData.bids[it.key] ?: 0 }
        val teamBTotal = teamBPlayers.sumOf { roundData.bids[it.key] ?: 0 }

        // Validate house constraint
        if (teamATotal < 5 || teamATotal > 8 || teamBTotal < 5 || teamBTotal > 8) {
            throw IllegalArgumentException(
                "Invalid house total: Team A=$teamATotal, Team B=$teamBTotal. Both must be 5-8."
            )
        }

        val declarerTeam = if (teamATotal >= teamBTotal) TeamId.A else TeamId.B

        return roundData.copy(
            phase = GamePhase.PLAYING,
            totalTeamACall = teamATotal,
            totalTeamBCall = teamBTotal,
            declarerTeam = declarerTeam,
            defenderTeam = declarerTeam.getOpponent()
        )
    }

    /**
     * Finalize settlement and calculate scores
     */
    fun finalizeSettlement(
        roundData: CPRoundData,
        players: List<CPPlayer>,
        config: CPScoringConfig = CPScoringConfig()
    ): CPRoundData {
        val teamAPlayers = players.getTeamPlayers(TeamId.A)
        val teamBPlayers = players.getTeamPlayers(TeamId.B)

        val teamATricksWon = teamAPlayers.sumOf { roundData.tricksWon[it.key] ?: 0 }
        val teamBTricksWon = teamBPlayers.sumOf { roundData.tricksWon[it.key] ?: 0 }

        require(teamATricksWon + teamBTricksWon == 8) {
            "Trick count mismatch: Team A=$teamATricksWon, Team B=$teamBTricksWon. Total must be 8."
        }

        val scoringResult = calculateRoundScores(
            roundData.copy(
                teamATricksWon = teamATricksWon,
                teamBTricksWon = teamBTricksWon
            ),
            config
        )

        return roundData.copy(
            phase = GamePhase.SETTLEMENT,
            teamATricksWon = teamATricksWon,
            teamBTricksWon = teamBTricksWon,
            teamAScore = scoringResult.teamAScore,
            teamBScore = scoringResult.teamBScore
        )
    }

    /**
     * Check if match should be completed
     */
    fun checkMatchCompletion(
        teamATotal: Int,
        teamBTotal: Int,
        pointsToWin: Int = 52
    ): Pair<Boolean, TeamId?> {
        return when {
            teamATotal >= pointsToWin -> true to TeamId.A
            teamBTotal >= pointsToWin -> true to TeamId.B
            else -> false to null
        }
    }

    /**
     * Create next round from current round
     */
    fun createNextRound(
        currentRound: CPRoundData,
        players: List<CPPlayer>
    ): CPRoundData {
        val nextRoundNumber = currentRound.roundNumber + 1

        return CPRoundData(
            roundNumber = nextRoundNumber,
            phase = GamePhase.BIDDING,
            timestamp = java.time.LocalDateTime.now()
        )
    }

    /**
     * Format score display string
     */
    fun formatScoreDifferential(
        teamATotal: Int,
        teamBTotal: Int,
        pointsToWin: Int = 52
    ): String {
        val differential = kotlin.math.abs(teamATotal - teamBTotal)
        val leaderTeam = when {
            teamATotal > teamBTotal -> TeamId.A
            teamBTotal > teamATotal -> TeamId.B
            else -> null
        }
        val pointsLeftToWin = pointsToWin - maxOf(teamATotal, teamBTotal)

        return if (leaderTeam != null) {
            "Team $leaderTeam leads by $differential pts — $pointsLeftToWin pts left to win"
        } else {
            "Teams tied — $pointsLeftToWin pts to reach $pointsToWin"
        }
    }
}
