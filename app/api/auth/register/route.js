import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createUser, getUserByUsername } from '@/lib/db'

const SECRET_REG_KEY = "Zaxon_Secret"

export async function POST(request) {
  try {
    const { username, password, registrationKey } = await request.json()
    // 1. Check secret registration key
    if (registrationKey !== SECRET_REG_KEY) {
      return NextResponse.json({ error: 'Invalid registration key' }, { status: 401 })
    }

    // 2. Basic validation
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // 3. Check if username is taken
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 5. Create user
    const newUser = await createUser({
      username,
      password: hashedPassword,
    })

    // 6. Return success
    return NextResponse.json({ message: 'User registered successfully', userId: newUser.id }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
