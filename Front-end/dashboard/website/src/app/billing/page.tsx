'use client';

import { Suspense } from 'react';
import BillingForm from '@/components/BillingForm';
import ClientOnly from '@/components/ClientOnly';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientOnly fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        }>
          <BillingForm />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
