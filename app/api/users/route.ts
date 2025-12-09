import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import UserModel from '@/models/User';
import SectionModel from '@/models/Section';
import bcrypt from 'bcrypt';

// GET /api/users - Get all users with optional filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const accessSection = searchParams.get('accessSection');
    const isActive = searchParams.get('isActive');
    
    const filter: any = {};
    if (role) filter.role = role;
    if (accessSection) filter.accessSection = accessSection;
    if (isActive !== null) filter.isActive = isActive === 'true';
    
    const users = await UserModel.find(filter)
      .select('-password -forgotpasswordToken -forgotpasswordToeknExpiry -verifyToken -verifyTokenExpiry')
      .sort({ createdAt: -1 });
    
    // Populate section information if needed
    const usersWithSections = await Promise.all(
      users.map(async (user) => {
        let section = null;
        
        // Only try to find section if accessSection is a valid ObjectId
        if (user.accessSection && user.accessSection !== "all" && user.accessSection.match(/^[0-9a-fA-F]{24}$/)) {
          section = await SectionModel.findById(user.accessSection);
        } else if (user.accessSection === "all") {
          // For SuperAdmin users with "all" access, create a virtual section
          section = {
            _id: "all",
            name: "All Sections",
            description: "Access to all sections",
            isActive: true
          };
        } else if (user.accessSection && user.accessSection !== "all") {
          // If it's not an ObjectId and not "all", treat it as a department name
          section = {
            _id: user.accessSection,
            name: user.accessSection,
            description: `Department: ${user.accessSection}`,
            isActive: true
          };
        }
        
        return {
          ...user.toObject(),
          section: section
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: usersWithSections
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      username, 
      email, 
      password, 
      accessSection, 
      role = 'operator',
      isAdmin = false 
    } = body;
    
    // Validate required fields
    if (!username || !email || !password || !accessSection) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await UserModel.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }
    
    // Verify section exists (skip validation for "all" access)
    if (accessSection !== "all") {
      // Check if it's a valid ObjectId first
      if (accessSection.match(/^[0-9a-fA-F]{24}$/)) {
        const section = await SectionModel.findById(accessSection);
        if (!section) {
          return NextResponse.json(
            { success: false, error: 'Invalid section ID' },
            { status: 400 }
          );
        }
      }
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const user = new UserModel({
      username,
      email,
      password: hashedPassword,
      accessSection,
      role,
      isAdmin,
      isverified: true // Auto-verify for admin-created users
    });
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.forgotpasswordToken;
    delete userResponse.forgotpasswordToeknExpiry;
    delete userResponse.verifyToken;
    delete userResponse.verifyTokenExpiry;
    
    return NextResponse.json({
      success: true,
      data: userResponse
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
