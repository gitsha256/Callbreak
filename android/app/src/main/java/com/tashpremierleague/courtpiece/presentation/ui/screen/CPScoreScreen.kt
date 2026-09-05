/**
 * Court Piece Scorecard Screen - Jetpack Compose
 * Main UI for 6-player team-based game
 */

package com.tashpremierleague.courtpiece.presentation.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import com.tashpremierleague.courtpiece.data.model.*
import com.tashpremierleague.courtpiece.presentation.viewmodel.CPGameAction
import com.tashpremierleague.courtpiece.presentation.viewmodel.CPSixPlayerViewModel

@Composable
fun CPScoreScreen(
    viewModel: CPSixPlayerViewModel = viewModel(),
    onBackClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val gameState = uiState.gameState
    val currentRound = gameState.rounds.getOrNull(gameState.currentRoundIndex)
        ?: return

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
    ) {
        // Header
        TopAppBar(
            title = { Text("Court Piece - Match Progress") },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            modifier = Modifier.fillMaxWidth()
        )

        // Match Status
        MatchStatusCard(
            roundNumber = currentRound.roundNumber,
            phase = gameState.currentPhase,
            teamATotal = gameState.matchTotals.teamATotal,
            teamBTotal = gameState.matchTotals.teamBTotal,
            scoreDifferential = uiState.scoreDifferential
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Error Display
        if (uiState.error != null) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFFFEBEE)
                )
            ) {
                Text(
                    text = uiState.error ?: "Unknown error",
                    color = Color(0xFFC62828),
                    modifier = Modifier.padding(16.dp)
                )
            }
        }

        // Team A Section
        TeamSectionCard(
            teamId = TeamId.A,
            players = gameState.players.filter { it.team == TeamId.A },
            round = currentRound,
            teamTotal = gameState.matchTotals.teamATotal,
            teamCall = currentRound.totalTeamACall,
            currentPhase = gameState.currentPhase,
            onBidChange = { playerKey, bid ->
                viewModel.dispatch(CPGameAction.PlaceBid(playerKey, bid))
            },
            onTrickChange = { playerKey, tricks ->
                viewModel.dispatch(CPGameAction.RecordTrick(playerKey, tricks))
            }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Team B Section
        TeamSectionCard(
            teamId = TeamId.B,
            players = gameState.players.filter { it.team == TeamId.B },
            round = currentRound,
            teamTotal = gameState.matchTotals.teamBTotal,
            teamCall = currentRound.totalTeamBCall,
            currentPhase = gameState.currentPhase,
            onBidChange = { playerKey, bid ->
                viewModel.dispatch(CPGameAction.PlaceBid(playerKey, bid))
            },
            onTrickChange = { playerKey, tricks ->
                viewModel.dispatch(CPGameAction.RecordTrick(playerKey, tricks))
            }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Action Buttons
        ActionButtonsSection(
            currentPhase = gameState.currentPhase,
            areAllBidsPlaced = uiState.areAllBidsPlaced,
            areAllTricksRecorded = uiState.areAllTricksRecorded,
            onFinalizeBidding = {
                viewModel.dispatch(CPGameAction.FinalizeBidding)
            },
            onFinalizeSettlement = {
                viewModel.dispatch(CPGameAction.FinalizeSettlement)
            },
            onStartNextRound = {
                viewModel.dispatch(CPGameAction.StartNextRound)
            }
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun MatchStatusCard(
    roundNumber: Int,
    phase: GamePhase,
    teamATotal: Int,
    teamBTotal: Int,
    scoreDifferential: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Round $roundNumber • ${phase.name}",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Team A Total
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Team A Total", fontSize = 12.sp)
                    Text(
                        text = teamATotal.toString(),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1976D2)
                    )
                }

                // Differential
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Differential", fontSize = 12.sp)
                    Text(
                        text = scoreDifferential,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Team B Total
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Team B Total", fontSize = 12.sp)
                    Text(
                        text = teamBTotal.toString(),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFD32F2F)
                    )
                }
            }
        }
    }
}

@Composable
private fun TeamSectionCard(
    teamId: TeamId,
    players: List<CPPlayer>,
    round: CPRoundData,
    teamTotal: Int,
    teamCall: Int?,
    currentPhase: GamePhase,
    onBidChange: (String, Int) -> Unit,
    onTrickChange: (String, Int) -> Unit
) {
    val backgroundColor = if (teamId == TeamId.A) Color(0xFFE3F2FD) else Color(0xFFFFEBEE)
    val textColor = if (teamId == TeamId.A) Color(0xFF1565C0) else Color(0xFFC62828)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Team $teamId",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = textColor
                )
                Text(
                    text = "Call: ${teamCall ?: "-"}",
                    fontSize = 12.sp,
                    color = textColor
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            players.forEach { player ->
                PlayerRowItem(
                    player = player,
                    playerBid = round.bids[player.key],
                    playerTricks = round.tricksWon[player.key],
                    currentPhase = currentPhase,
                    onBidChange = { bid -> onBidChange(player.key, bid) },
                    onTrickChange = { tricks -> onTrickChange(player.key, tricks) }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun PlayerRowItem(
    player: CPPlayer,
    playerBid: Int?,
    playerTricks: Int?,
    currentPhase: GamePhase,
    onBidChange: (Int) -> Unit,
    onTrickChange: (Int) -> Unit
) {
    var editingValue by remember { mutableStateOf<String?>(null) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = player.name, modifier = Modifier.weight(1f))

        // Input field based on phase
        if (currentPhase == GamePhase.BIDDING) {
            OutlinedTextField(
                value = editingValue ?: (playerBid?.toString() ?: ""),
                onValueChange = { editingValue = it },
                modifier = Modifier.width(60.dp),
                singleLine = true,
                trailingIcon = {
                    if (editingValue != null) {
                        Button(
                            onClick = {
                                editingValue?.toIntOrNull()?.let { onBidChange(it) }
                                editingValue = null
                            },
                            modifier = Modifier.size(24.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("✓", fontSize = 10.sp)
                        }
                    }
                }
            )
        } else if (currentPhase == GamePhase.SETTLEMENT) {
            OutlinedTextField(
                value = editingValue ?: (playerTricks?.toString() ?: ""),
                onValueChange = { editingValue = it },
                modifier = Modifier.width(60.dp),
                singleLine = true,
                trailingIcon = {
                    if (editingValue != null) {
                        Button(
                            onClick = {
                                editingValue?.toIntOrNull()?.let { onTrickChange(it) }
                                editingValue = null
                            },
                            modifier = Modifier.size(24.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("✓", fontSize = 10.sp)
                        }
                    }
                }
            )
        } else {
            Text(text = playerTricks?.toString() ?: "-")
        }
    }
}

@Composable
private fun ActionButtonsSection(
    currentPhase: GamePhase,
    areAllBidsPlaced: Boolean,
    areAllTricksRecorded: Boolean,
    onFinalizeBidding: () -> Unit,
    onFinalizeSettlement: () -> Unit,
    onStartNextRound: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        when (currentPhase) {
            GamePhase.BIDDING -> {
                Button(
                    onClick = onFinalizeBidding,
                    enabled = areAllBidsPlaced,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Text("Finalize Bidding")
                }
            }

            GamePhase.SETTLEMENT -> {
                Button(
                    onClick = onFinalizeSettlement,
                    enabled = areAllTricksRecorded,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Text("Finalize Settlement & Calculate Scores")
                }
            }

            GamePhase.PLAYING -> {
                Text("Recording tricks won...", style = MaterialTheme.typography.bodyMedium)
            }

            else -> {
                Button(
                    onClick = onStartNextRound,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Text("Start Next Round")
                }
            }
        }
    }
}
