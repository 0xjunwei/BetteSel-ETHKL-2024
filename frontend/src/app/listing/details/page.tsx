import { Suspense } from 'react'
import ListingDetailsWrapper from './listing-details-wrapper'

export default function ListingDetailsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingDetailsWrapper />
    </Suspense>
  )
}