/**
 * Room Database Setup for Court Piece
 * DAOs and Database configuration
 */

package com.tashpremierleague.courtpiece.data.database

import androidx.room.*
import com.tashpremierleague.courtpiece.data.model.*
import kotlinx.coroutines.flow.Flow

// ============= DAOs =============

@Dao
interface CPMatchDao {
    @Insert
    suspend fun insertMatch(match: CPMatchEntity): Long

    @Update
    suspend fun updateMatch(match: CPMatchEntity)

    @Query("SELECT * FROM cp_matches WHERE matchId = :matchId")
    suspend fun getMatch(matchId: Long): CPMatchEntity?

    @Query("SELECT * FROM cp_matches ORDER BY startTime DESC")
    fun getAllMatches(): Flow<List<CPMatchEntity>>

    @Query("SELECT * FROM cp_matches WHERE isCompleted = 0 ORDER BY startTime DESC LIMIT 1")
    fun getLastActiveMatch(): Flow<CPMatchEntity?>

    @Query("DELETE FROM cp_matches WHERE matchId = :matchId")
    suspend fun deleteMatch(matchId: Long)
}

@Dao
interface CPRoundDao {
    @Insert
    suspend fun insertRound(round: CPRoundEntity): Long

    @Update
    suspend fun updateRound(round: CPRoundEntity)

    @Query("SELECT * FROM cp_rounds WHERE matchId = :matchId ORDER BY roundNumber")
    fun getRoundsForMatch(matchId: Long): Flow<List<CPRoundEntity>>

    @Query("SELECT * FROM cp_rounds WHERE roundId = :roundId")
    suspend fun getRound(roundId: Long): CPRoundEntity?

    @Query("DELETE FROM cp_rounds WHERE matchId = :matchId")
    suspend fun deleteRoundsForMatch(matchId: Long)
}

@Dao
interface CPPlayerBidDao {
    @Insert
    suspend fun insertBid(bid: CPPlayerBidEntity): Long

    @Update
    suspend fun updateBid(bid: CPPlayerBidEntity)

    @Query("SELECT * FROM cp_player_bids WHERE roundId = :roundId")
    fun getBidsForRound(roundId: Long): Flow<List<CPPlayerBidEntity>>

    @Query("DELETE FROM cp_player_bids WHERE roundId = :roundId")
    suspend fun deleteBidsForRound(roundId: Long)
}

@Dao
interface CPPlayerTricksDao {
    @Insert
    suspend fun insertTricks(tricks: CPPlayerTricksEntity): Long

    @Update
    suspend fun updateTricks(tricks: CPPlayerTricksEntity)

    @Query("SELECT * FROM cp_player_tricks WHERE roundId = :roundId")
    fun getTricksForRound(roundId: Long): Flow<List<CPPlayerTricksEntity>>

    @Query("DELETE FROM cp_player_tricks WHERE roundId = :roundId")
    suspend fun deleteTricksForRound(roundId: Long)
}

@Dao
interface CPGamePlayerDao {
    @Insert
    suspend fun insertPlayer(player: CPGamePlayerEntity): Long

    @Update
    suspend fun updatePlayer(player: CPGamePlayerEntity)

    @Query("SELECT * FROM cp_game_players WHERE matchId = :matchId ORDER BY seatPosition")
    fun getPlayersForMatch(matchId: Long): Flow<List<CPGamePlayerEntity>>

    @Query("DELETE FROM cp_game_players WHERE matchId = :matchId")
    suspend fun deletePlayersForMatch(matchId: Long)
}

// ============= Complex Queries (with Relations) =============

@Dao
interface CPRoundWithDetailsDao {
    @Transaction
    @Query("SELECT * FROM cp_rounds WHERE roundId = :roundId")
    suspend fun getRoundWithDetails(roundId: Long): CPRoundWithDetails?

    @Transaction
    @Query("SELECT * FROM cp_rounds WHERE matchId = :matchId ORDER BY roundNumber")
    fun getRoundsWithDetailsForMatch(matchId: Long): Flow<List<CPRoundWithDetails>>
}

@Dao
interface CPMatchWithRoundsDao {
    @Transaction
    @Query("SELECT * FROM cp_matches WHERE matchId = :matchId")
    suspend fun getMatchWithRounds(matchId: Long): CPMatchWithRounds?

    @Transaction
    @Query("SELECT * FROM cp_matches ORDER BY startTime DESC")
    fun getAllMatchesWithRounds(): Flow<List<CPMatchWithRounds>>
}

// ============= Database Configuration =============

@Database(
    entities = [
        CPMatchEntity::class,
        CPRoundEntity::class,
        CPPlayerBidEntity::class,
        CPPlayerTricksEntity::class,
        CPGamePlayerEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class CPDatabase : RoomDatabase() {
    abstract fun matchDao(): CPMatchDao
    abstract fun roundDao(): CPRoundDao
    abstract fun playerBidDao(): CPPlayerBidDao
    abstract fun playerTricksDao(): CPPlayerTricksDao
    abstract fun gamePlayerDao(): CPGamePlayerDao
    abstract fun roundWithDetailsDao(): CPRoundWithDetailsDao
    abstract fun matchWithRoundsDao(): CPMatchWithRoundsDao

    companion object {
        const val DATABASE_NAME = "court_piece_db"
    }
}

// ============= Migration Helpers =============

/**
 * Database migration for future schema updates
 * Example: MIGRATION_1_2 for upgrading from v1 to v2
 */
object DatabaseMigrations {
    // When adding new migrations, follow this pattern:
    // val MIGRATION_1_2 = object : Migration(1, 2) {
    //     override fun migrate(database: SupportSQLiteDatabase) {
    //         // Add new columns or tables
    //         database.execSQL("ALTER TABLE cp_matches ADD COLUMN newColumn TEXT")
    //     }
    // }

    fun getMigrations(): Array<Migration> {
        return arrayOf()
        // When migrations are added:
        // return arrayOf(MIGRATION_1_2, MIGRATION_2_3)
    }
}

// ============= Repository Pattern =============

/**
 * Court Piece Game Repository
 * Abstraction layer for database operations
 */
class CPGameRepository(private val database: CPDatabase) {

    val matchDao = database.matchDao()
    val roundDao = database.roundDao()
    val playerBidDao = database.playerBidDao()
    val playerTricksDao = database.playerTricksDao()
    val gamePlayerDao = database.gamePlayerDao()

    // Match operations
    suspend fun createMatch(
        teamATotal: Int = 0,
        teamBTotal: Int = 0,
        deckConfiguration: String = "deck48"
    ): Long {
        val match = CPMatchEntity(
            gameMode = "COURT_PIECE",
            teamATotal = teamATotal,
            teamBTotal = teamBTotal,
            deckConfiguration = deckConfiguration
        )
        return matchDao.insertMatch(match)
    }

    suspend fun updateMatchScore(
        matchId: Long,
        teamATotal: Int,
        teamBTotal: Int,
        winner: String? = null,
        isCompleted: Boolean = false
    ) {
        val match = matchDao.getMatch(matchId)
        if (match != null) {
            matchDao.updateMatch(
                match.copy(
                    teamATotal = teamATotal,
                    teamBTotal = teamBTotal,
                    matchWinner = winner,
                    isCompleted = isCompleted,
                    endTime = if (isCompleted) java.time.LocalDateTime.now() else null
                )
            )
        }
    }

    fun getLastActiveMatch() = matchDao.getLastActiveMatch()

    // Round operations
    suspend fun createRound(
        matchId: Long,
        roundNumber: Int,
        teamACall: Int? = null,
        teamBCall: Int? = null,
        declarerTeam: String? = null
    ): Long {
        val round = CPRoundEntity(
            matchId = matchId,
            roundNumber = roundNumber,
            phase = "BIDDING",
            teamACall = teamACall,
            teamBCall = teamBCall,
            declarerTeam = declarerTeam,
            teamATricksWon = null,
            teamBTricksWon = null,
            teamAScore = null,
            teamBScore = null
        )
        return roundDao.insertRound(round)
    }

    suspend fun finalizeRound(
        roundId: Long,
        teamATricksWon: Int,
        teamBTricksWon: Int,
        teamAScore: Int,
        teamBScore: Int
    ) {
        val round = roundDao.getRound(roundId)
        if (round != null) {
            roundDao.updateRound(
                round.copy(
                    phase = "SETTLEMENT",
                    teamATricksWon = teamATricksWon,
                    teamBTricksWon = teamBTricksWon,
                    teamAScore = teamAScore,
                    teamBScore = teamBScore
                )
            )
        }
    }

    // Player operations
    suspend fun addPlayersToMatch(
        matchId: Long,
        players: List<CPPlayer>
    ) {
        players.forEach { player ->
            gamePlayerDao.insertPlayer(
                CPGamePlayerEntity(
                    matchId = matchId,
                    playerKey = player.key,
                    playerName = player.name,
                    team = player.team.name,
                    seatPosition = player.seatPosition
                )
            )
        }
    }

    // Bid operations
    suspend fun recordPlayerBid(
        roundId: Long,
        playerKey: String,
        playerName: String,
        team: String,
        bid: Int
    ) {
        playerBidDao.insertBid(
            CPPlayerBidEntity(
                roundId = roundId,
                playerKey = playerKey,
                playerName = playerName,
                team = team,
                bid = bid
            )
        )
    }

    // Tricks operations
    suspend fun recordPlayerTricks(
        roundId: Long,
        playerKey: String,
        playerName: String,
        team: String,
        tricksWon: Int
    ) {
        playerTricksDao.insertTricks(
            CPPlayerTricksEntity(
                roundId = roundId,
                playerKey = playerKey,
                playerName = playerName,
                team = team,
                tricksWon = tricksWon
            )
        )
    }

    // Query operations
    fun getMatchHistory() = matchDao.getAllMatches()

    fun getRoundsForMatch(matchId: Long) =
        database.roundWithDetailsDao().getRoundsWithDetailsForMatch(matchId)

    suspend fun getCompleteMatch(matchId: Long) =
        database.matchWithRoundsDao().getMatchWithRounds(matchId)

    // Cleanup
    suspend fun deleteMatch(matchId: Long) {
        matchDao.deleteMatch(matchId)
    }
}
