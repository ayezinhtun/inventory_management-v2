import React from 'react';
import { useStore } from '../store/useStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'../components/ui/Card';
import { Construction } from 'lucide-react';
export function PlaceholderPage() {
  const { currentPage } = useStore();
  // Format page name for display
  const title = currentPage.
  split('-').
  map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
  join(' ');
  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          {title}
        </h1>
        <p className="text-muted-foreground">
          This module is currently under construction.
        </p>
      </div>

      <Card className="flex-1 flex flex-col items-center justify-center text-center border-dashed border-2">
        <CardContent className="pt-6 flex flex-col items-center space-y-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Construction className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              The {title} module is part of the next development phase. Please
              check back later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>);

}