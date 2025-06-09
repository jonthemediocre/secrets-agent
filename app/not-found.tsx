'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MagnifyingGlassIcon, HomeIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MagnifyingGlassIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/">
                <HomeIcon className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
              Go back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 