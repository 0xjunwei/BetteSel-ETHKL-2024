import ListingDetails from '../listing-details'

export default function ListingPage({ params }: { params: { id: string } }) {
  return <ListingDetails id={params.id} />
}