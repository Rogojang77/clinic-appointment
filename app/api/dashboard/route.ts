import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import UserModel from '@/models/User';
import SectionModel from '@/models/Section';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import DoctorModel from '@/models/Doctor';
import AppointmentModel from '@/models/Appointment';
import { requireAuth, isSuperAdmin } from '@/utils/authHelpers';

// GET /api/dashboard - Get dashboard overview data
export async function GET(request: NextRequest) {
  try {
    // Authenticate request - only super admins can access dashboard API
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }
    const { payload: user } = authResult;

    // Check if user is super admin
    if (!isSuperAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get end of today
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Get start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Get end of month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Get counts for each entity
    const [
      totalUsers,
      totalSections,
      totalActivitySchedules,
      totalDoctors,
      totalAppointments,
      activeUsers,
      activeSections,
      activeActivitySchedules,
      activeDoctors,
      activeAppointments,
      confirmedAppointments,
      unconfirmedAppointments,
      appointmentsToday,
      appointmentsThisWeek,
      appointmentsThisMonth,
      usersByRole,
      sectionsWithSchedules,
      appointmentsByLocation,
      appointmentsByTestType
    ] = await Promise.all([
      UserModel.countDocuments(),
      SectionModel.countDocuments(),
      ActivityScheduleModel.countDocuments(),
      DoctorModel.countDocuments(),
      AppointmentModel.countDocuments(),
      UserModel.countDocuments({ isverified: true }),
      SectionModel.countDocuments({ isActive: true }),
      ActivityScheduleModel.countDocuments({ isActive: true }),
      DoctorModel.countDocuments({ isActive: true }),
      AppointmentModel.countDocuments({ date: { $gte: today } }),
      AppointmentModel.countDocuments({ isConfirmed: true }),
      AppointmentModel.countDocuments({ isConfirmed: false }),
      AppointmentModel.countDocuments({ date: { $gte: today, $lte: endOfToday } }),
      AppointmentModel.countDocuments({ date: { $gte: startOfWeek, $lte: endOfWeek } }),
      AppointmentModel.countDocuments({ date: { $gte: startOfMonth, $lte: endOfMonth } }),
      UserModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      ActivityScheduleModel.aggregate([
        { $group: { _id: '$sectionId', count: { $sum: 1 } } },
        { $lookup: {
          from: 'sections',
          localField: '_id',
          foreignField: '_id',
          as: 'section'
        }},
        { $unwind: '$section' },
        { $project: {
          sectionName: '$section.name',
          scheduleCount: '$count'
        }}
      ]),
      AppointmentModel.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AppointmentModel.aggregate([
        { $group: { _id: '$testType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    // Get recent activity (last 10 users, schedules, and appointments)
    const [recentUsers, recentSchedules, recentAppointments] = await Promise.all([
      UserModel.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(10),
      ActivityScheduleModel.find()
        .populate('userId', 'username email')
        .populate('sectionId', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
      AppointmentModel.find()
        .populate('sectionId', 'name')
        .populate('doctorId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);
    
    // Get sections with user counts
    const sectionsWithUserCounts = await SectionModel.aggregate([
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'accessSection',
        as: 'users'
      }},
      { $project: {
        name: 1,
        description: 1,
        isActive: 1,
        userCount: { $size: '$users' }
      }}
    ]);
    
    const dashboardData = {
      overview: {
        totalUsers,
        totalSections,
        totalActivitySchedules,
        totalDoctors,
        totalAppointments,
        activeUsers,
        activeSections,
        activeActivitySchedules,
        activeDoctors,
        activeAppointments,
        confirmedAppointments,
        unconfirmedAppointments,
        appointmentsToday,
        appointmentsThisWeek,
        appointmentsThisMonth
      },
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      sectionsWithSchedules,
      sectionsWithUserCounts,
      appointmentsByLocation: appointmentsByLocation.map(item => ({
        location: item._id,
        count: item.count
      })),
      appointmentsByTestType: appointmentsByTestType.map(item => ({
        testType: item._id,
        count: item.count
      })),
      recentActivity: {
        users: recentUsers,
        schedules: recentSchedules,
        appointments: recentAppointments
      }
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
