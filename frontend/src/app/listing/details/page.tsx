"use client"

import { useSearchParams } from 'next/navigation'
import ListingDetails from '../listing-details'

export default function ListingDetailsPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  if (!id) {
    return <div>No listing ID provided</div>
  }

  return <ListingDetails id={id} />
}