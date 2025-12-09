import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import UserModel from '@/models/User';
import SectionModel from '@/models/Section';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// GET /api/users/[id] - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const user = await UserModel.findById(params.id)
      .select('-password -forgotpasswordToken -forgotpasswordToeknExpiry -verifyToken -verifyTokenExpiry');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Populate section information
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
    
    const userWithSection = {
      ...user.toObject(),
      section: section
    };
    
    return NextResponse.json({
      success: true,
      data: userWithSection
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { 
      username, 
      email, 
      password, 
      accessSection, 
      role, 
      isAdmin,
      isverified 
    } = body;
    
    // Check if user exists
    const existingUser = await UserModel.findById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check for email/username conflicts if being changed
    if (email && email !== existingUser.email) {
      const emailConflict = await UserModel.findOne({ 
        email, 
        _id: { $ne: params.id } 
      });
      if (emailConflict) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }
    
    if (username && username !== existingUser.username) {
      const usernameConflict = await UserModel.findOne({ 
        username, 
        _id: { $ne: params.id } 
      });
      if (usernameConflict) {
        return NextResponse.json(
          { success: false, error: 'User with this username already exists' },
          { status: 409 }
        );
      }
    }
    
    // Verify section exists if being changed (skip validation for "all" access)
    if (accessSection && accessSection !== existingUser.accessSection && accessSection !== "all") {
      // Check if it's a valid ObjectId first
      if (accessSection.match(/^[0-9a-fA-F]{24}$/)) {
        const section = await SectionModel.findById(accessSection);
        if (!section) {
          return NextResponse.json(
            { success: false, error: 'Invalid section ID' },
            { status: 400 }
          );
        }
      } else {
        // If it's not an ObjectId, it might be a department name (temporary)
        console.warn(`User updated with department name as accessSection: ${accessSection}`);
      }
    }
    
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (accessSection !== undefined) updateData.accessSection = accessSection;
    if (role !== undefined) updateData.role = role;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (isverified !== undefined) updateData.isverified = isverified;
    
    // Handle password update
    if (password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }
    
    const updatedUser = await UserModel.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -forgotpasswordToken -forgotpasswordToeknExpiry -verifyToken -verifyTokenExpiry');
    
    return NextResponse.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const user = await UserModel.findById(params.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    await UserModel.findByIdAndDelete(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
