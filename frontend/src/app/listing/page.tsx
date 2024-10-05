import { Suspense } from 'react'
import ListingDetails from './listing-details'

export default function ListingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingDetails />
    </Suspense>
  )
}