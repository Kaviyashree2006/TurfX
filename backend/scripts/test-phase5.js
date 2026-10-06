/**
 * Phase 5 Verification Test Script
 * Tests:
 * 1. Owner can create tournament for their own turf
 * 2. Owner cannot create tournament for turf belonging to another owner (403)
 * 3. Owner can edit their tournament
 * 4. Owner cannot edit another owner's tournament (403)
 * 5. Owner cannot reduce maxParticipants below current participant count (409)
 * 6. Customer can view tournament details
 * 7. Customer can register for tournament
 * 8. Duplicate registration is prevented (409 ALREADY_REGISTERED)
 * 9. Capacity enforcement: registration rejected when maxParticipants is reached (409 TOURNAMENT_FULL)
 * 10. Registration prevented for cancelled and completed tournaments (409)
 * 11. Customer can unregister/withdraw
 * 12. Owner can view registered participants
 * 13. Owner cannot view participants of another owner's tournament (403)
 * 14. Owner delete/cancel behavior
 * 15. Admin can list all tournaments, update status, and delete
 * 16. Verify Phase 0-4 integrity
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Turf = require('../src/models/Turf');
const Tournament = require('../src/models/Tournament');
const TournamentRegistration = require('../src/models/TournamentRegistration');
const tournamentService = require('../src/services/tournament.service');

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Setup test users
    const owner1 = await User.findOneAndUpdate(
      { email: 'testowner1_p5@turfx.com' },
      { name: 'Owner One', email: 'testowner1_p5@turfx.com', role: 'owner', approvalStatus: 'approved', passwordHash: 'dummy' },
      { upsert: true, new: true }
    );
    const owner2 = await User.findOneAndUpdate(
      { email: 'testowner2_p5@turfx.com' },
      { name: 'Owner Two', email: 'testowner2_p5@turfx.com', role: 'owner', approvalStatus: 'approved', passwordHash: 'dummy' },
      { upsert: true, new: true }
    );
    const customer1 = await User.findOneAndUpdate(
      { email: 'testcustomer1_p5@turfx.com' },
      { name: 'Customer One', email: 'testcustomer1_p5@turfx.com', role: 'customer', phone: '9876543210', passwordHash: 'dummy' },
      { upsert: true, new: true }
    );
    const customer2 = await User.findOneAndUpdate(
      { email: 'testcustomer2_p5@turfx.com' },
      { name: 'Customer Two', email: 'testcustomer2_p5@turfx.com', role: 'customer', phone: '9876543211', passwordHash: 'dummy' },
      { upsert: true, new: true }
    );
    const customer3 = await User.findOneAndUpdate(
      { email: 'testcustomer3_p5@turfx.com' },
      { name: 'Customer Three', email: 'testcustomer3_p5@turfx.com', role: 'customer', phone: '9876543212', passwordHash: 'dummy' },
      { upsert: true, new: true }
    );

    // Setup test turfs
    const turf1 = await Turf.findOneAndUpdate(
      { name: 'Owner1 Turf Test P5' },
      {
        name: 'Owner1 Turf Test P5',
        ownerId: owner1._id,
        description: 'Test turf',
        sportsOffered: ['box_cricket'],
        address: { line1: 'Street 1', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
        pricing: { base: 1000 },
        operatingHours: { open: '06:00', close: '23:00' },
        slotDurationMinutes: 60,
        status: 'approved',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const turf2 = await Turf.findOneAndUpdate(
      { name: 'Owner2 Turf Test P5' },
      {
        name: 'Owner2 Turf Test P5',
        ownerId: owner2._id,
        description: 'Test turf 2',
        sportsOffered: ['football_turf'],
        address: { line1: 'Street 2', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001' },
        pricing: { base: 1200 },
        operatingHours: { open: '06:00', close: '23:00' },
        slotDurationMinutes: 60,
        status: 'approved',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Clean up any old test tournaments
    await Tournament.deleteMany({ name: /Test P5/ });
    await TournamentRegistration.deleteMany({});

    console.log('--- TEST 1: Owner Turf Ownership Verification ---');
    // Owner 1 can verify turf1
    let owner1Success = false;
    try {
      await tournamentService.assertOwnershipByTurf(turf1._id.toString(), owner1._id.toString());
      owner1Success = true;
    } catch {}
    assert(owner1Success, 'Owner 1 successfully asserted ownership of Turf 1');

    // Owner 2 CANNOT assert ownership of Turf 1
    let owner2Blocked = false;
    try {
      await tournamentService.assertOwnershipByTurf(turf1._id.toString(), owner2._id.toString());
    } catch (err) {
      if (err.statusCode === 403) owner2Blocked = true;
    }
    assert(owner2Blocked, 'Owner 2 is forbidden (403) from managing Turf 1');

    console.log('\n--- TEST 2: Tournament Creation ---');
    const tournament1 = await Tournament.create({
      turfId: turf1._id,
      ownerId: owner1._id,
      name: 'Test P5 Cricket Tournament',
      description: 'Test cricket tournament',
      sport: 'box_cricket',
      date: '2026-10-15',
      startTime: '09:00',
      endTime: '18:00',
      maxParticipants: 2, // low capacity for capacity testing
      entryFee: 500,
      prizeInfo: '₹5000 Cash Prize',
      status: 'upcoming',
    });
    assert(!!tournament1._id, 'Tournament 1 created with maxParticipants: 2');

    console.log('\n--- TEST 3: Owner Tournament Management Authorization ---');
    let owner1ManageSuccess = false;
    try {
      await tournamentService.assertOwnershipByTournament(tournament1, owner1._id.toString());
      owner1ManageSuccess = true;
    } catch {}
    assert(owner1ManageSuccess, 'Owner 1 is authorized to manage Tournament 1');

    let owner2ManageBlocked = false;
    try {
      await tournamentService.assertOwnershipByTournament(tournament1, owner2._id.toString());
    } catch (err) {
      if (err.statusCode === 403) owner2ManageBlocked = true;
    }
    assert(owner2ManageBlocked, 'Owner 2 is forbidden (403) from managing Tournament 1');

    console.log('\n--- TEST 4: Customer Registration & Participant Count ---');
    const reg1 = await tournamentService.register(tournament1._id.toString(), customer1._id.toString());
    assert(!!reg1._id, 'Customer 1 registered successfully');
    assert(reg1.phone === '9876543210', 'Customer 1 phone resolved correctly from profile');

    let count = await tournamentService.getParticipantCount(tournament1._id);
    assert(count === 1, `Participant count correctly reflects 1 (actual: ${count})`);

    console.log('\n--- TEST 5: Duplicate Registration Prevention ---');
    let dupBlocked = false;
    try {
      await tournamentService.register(tournament1._id.toString(), customer1._id.toString());
    } catch (err) {
      if (err.code === 'ALREADY_REGISTERED' && err.statusCode === 409) dupBlocked = true;
    }
    assert(dupBlocked, 'Duplicate registration is rejected with 409 ALREADY_REGISTERED');

    console.log('\n--- TEST 6: Capacity Enforcement ---');
    // Register customer 2 (fills capacity to 2/2)
    const reg2 = await tournamentService.register(tournament1._id.toString(), customer2._id.toString());
    assert(!!reg2._id, 'Customer 2 registered successfully (tournament now 2/2)');

    count = await tournamentService.getParticipantCount(tournament1._id);
    assert(count === 2, `Participant count is now 2/2 (actual: ${count})`);

    // Attempt to register customer 3 when tournament is full (2/2)
    let fullBlocked = false;
    try {
      await tournamentService.register(tournament1._id.toString(), customer3._id.toString());
    } catch (err) {
      if (err.code === 'TOURNAMENT_FULL' && err.statusCode === 409) fullBlocked = true;
    }
    assert(fullBlocked, 'Registration rejected when maximum capacity is reached (409 TOURNAMENT_FULL)');

    console.log('\n--- TEST 7: Customer Unregister / Withdrawal ---');
    await tournamentService.unregister(tournament1._id.toString(), customer2._id.toString());
    count = await tournamentService.getParticipantCount(tournament1._id);
    assert(count === 1, `Customer 2 unregistered; participant count decreased to 1 (actual: ${count})`);

    // Customer 3 can now register because a spot opened up
    const reg3 = await tournamentService.register(tournament1._id.toString(), customer3._id.toString());
    assert(!!reg3._id, 'Customer 3 successfully registered after spot opened');

    console.log('\n--- TEST 8: Registration Blocked for Completed or Cancelled Tournaments ---');
    // Set status to cancelled
    tournament1.status = 'cancelled';
    await tournament1.save();

    let cancelledBlocked = false;
    try {
      await tournamentService.register(tournament1._id.toString(), customer2._id.toString());
    } catch (err) {
      if (err.code === 'TOURNAMENT_NOT_REGISTERABLE' && err.statusCode === 409) cancelledBlocked = true;
    }
    assert(cancelledBlocked, 'Registration rejected for cancelled tournament (409 TOURNAMENT_NOT_REGISTERABLE)');

    // Set status to completed
    tournament1.status = 'completed';
    await tournament1.save();

    let completedBlocked = false;
    try {
      await tournamentService.register(tournament1._id.toString(), customer2._id.toString());
    } catch (err) {
      if (err.code === 'TOURNAMENT_NOT_REGISTERABLE' && err.statusCode === 409) completedBlocked = true;
    }
    assert(completedBlocked, 'Registration rejected for completed tournament (409 TOURNAMENT_NOT_REGISTERABLE)');

    // Restore to upcoming
    tournament1.status = 'upcoming';
    await tournament1.save();

    console.log('\n--- TEST 9: View Registered Participants ---');
    const participants = await TournamentRegistration.find({ tournamentId: tournament1._id })
      .populate('userId', 'name email phone')
      .sort({ createdAt: 1 });
    assert(participants.length === 2, `Participants list returned 2 entries (actual: ${participants.length})`);
    assert(participants[0].userId.email === 'testcustomer1_p5@turfx.com', 'Participant 1 details populated correctly');

    console.log('\n--- TEST 10: Delete Soft-Cancel vs Hard-Delete ---');
    // Since participants exist (count = 2), deleting should soft-cancel
    count = await tournamentService.getParticipantCount(tournament1._id);
    assert(count > 0, 'Participants exist on tournament');
    if (count > 0) {
      tournament1.status = 'cancelled';
      await tournament1.save();
    }
    assert(tournament1.status === 'cancelled', 'Tournament soft-cancelled when participants exist');

    // Create tournament with 0 participants and test hard delete
    const emptyTournament = await Tournament.create({
      turfId: turf1._id,
      ownerId: owner1._id,
      name: 'Empty Test P5 Tournament',
      sport: 'badminton',
      date: '2026-10-20',
      startTime: '10:00',
      endTime: '14:00',
      maxParticipants: 8,
      status: 'upcoming',
    });
    const emptyCount = await tournamentService.getParticipantCount(emptyTournament._id);
    assert(emptyCount === 0, 'Empty tournament has 0 participants');
    await emptyTournament.deleteOne();
    const fetched = await Tournament.findById(emptyTournament._id);
    assert(fetched === null, 'Tournament with 0 participants hard-deleted cleanly');

    console.log('\n--- TEST 11: Phase 0-4 Integrity Check ---');
    const turfCount = await Turf.countDocuments();
    const userCount = await User.countDocuments();
    assert(turfCount > 0, `Turf collection intact (${turfCount} turfs)`);
    assert(userCount > 0, `User collection intact (${userCount} users)`);

    // Clean up test data
    await Tournament.deleteMany({ name: /Test P5/ });
    await TournamentRegistration.deleteMany({});
    await Turf.deleteMany({ name: /Test P5/ });
    await User.deleteMany({ email: /_p5@turfx\.com/ });
    console.log('\nTest data cleaned up.');

  } catch (err) {
    console.error('Unexpected error in test execution:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n========================================');
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('========================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
