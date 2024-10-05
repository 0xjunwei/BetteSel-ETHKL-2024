import CreateListingForm from './create-listing-form'

export default function CreateListingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Create New Listing</h1>
      <CreateListingForm />
    </div>
  )
}