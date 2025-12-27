// app/middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // If the request is an OPTIONS request, handle it immediately
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust as needed for specific origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // For all other requests, proceed and attach CORS headers to the response
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*'); // Modify this for more restrictive policies
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

// Optionally, you can configure which routes the middleware applies to.
// This example applies the middleware to all routes under /api
export const config = {
  matcher: '/api/:path*',
};
