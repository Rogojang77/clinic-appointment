import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import UserModel from '@/models/User';
import SectionModel from '@/models/Section';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import DoctorModel from '@/models/Doctor';
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
    
    // Get counts for each entity
    const [
      totalUsers,
      totalSections,
      totalActivitySchedules,
      totalDoctors,
      activeUsers,
      activeSections,
      activeActivitySchedules,
      activeDoctors,
      usersByRole,
      sectionsWithSchedules
    ] = await Promise.all([
      UserModel.countDocuments(),
      SectionModel.countDocuments(),
      ActivityScheduleModel.countDocuments(),
      DoctorModel.countDocuments(),
      UserModel.countDocuments({ isverified: true }),
      SectionModel.countDocuments({ isActive: true }),
      ActivityScheduleModel.countDocuments({ isActive: true }),
      DoctorModel.countDocuments({ isActive: true }),
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
      ])
    ]);
    
    // Get recent activity (last 10 users and schedules)
    const [recentUsers, recentSchedules] = await Promise.all([
      UserModel.find()
        .select('-password -forgotpasswordToken -forgotpasswordToeknExpiry -verifyToken -verifyTokenExpiry')
        .sort({ createdAt: -1 })
        .limit(10),
      ActivityScheduleModel.find()
        .populate('userId', 'username email')
        .populate('sectionId', 'name')
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
        activeUsers,
        activeSections,
        activeActivitySchedules,
        activeDoctors
      },
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      sectionsWithSchedules,
      sectionsWithUserCounts,
      recentActivity: {
        users: recentUsers,
        schedules: recentSchedules
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
