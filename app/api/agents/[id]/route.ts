import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Agent from '@/models/Agent'
import { getToken } from 'next-auth/jwt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || !token.userId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const { id } = params
    const updates = await request.json()

    // Find the agent and verify ownership
    const agent = await Agent.findOne({ _id: id, userId: token.userId })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Allow specific updates
    if (updates.testCount !== undefined) {
      agent.testCount += 1
      agent.lastTested = new Date()
    }

    if (updates.isDeployed !== undefined) {
      agent.isDeployed = updates.isDeployed
    }

    if (updates.totalApiCalls !== undefined) {
      agent.totalApiCalls += 1
    }

    await agent.save()

    return NextResponse.json({ 
      message: 'Agent updated successfully', 
      agent 
    })

  } catch (error: any) {
    console.error('Update agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
