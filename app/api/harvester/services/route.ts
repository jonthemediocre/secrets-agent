import { NextRequest, NextResponse } from 'next/server'
import { API_SERVICES_REGISTRY } from '@/src/harvester/APIServiceRegistry'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const cliOnly = searchParams.get('cliOnly') === 'true'

    let filteredServices = [...API_SERVICES_REGISTRY]

    // Filter by category
    if (category && category !== 'all') {
      filteredServices = filteredServices.filter(service => 
        service.category === category
      )
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      filteredServices = filteredServices.filter(service =>
        service.name.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower)
      )
    }

    // Filter for CLI-supported only
    if (cliOnly) {
      filteredServices = filteredServices.filter(service => service.cliSupported)
    }

    // Sort by popularity
    filteredServices.sort((a, b) => b.popularity - a.popularity)

    return NextResponse.json({
      services: filteredServices,
      total: filteredServices.length,
      categories: [...new Set(API_SERVICES_REGISTRY.map(s => s.category))],
      stats: {
        totalServices: API_SERVICES_REGISTRY.length,
        cliSupported: API_SERVICES_REGISTRY.filter(s => s.cliSupported).length,
        avgPopularity: Math.round(
          API_SERVICES_REGISTRY.reduce((acc, s) => acc + s.popularity, 0) / 
          API_SERVICES_REGISTRY.length
        )
      }
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
} 