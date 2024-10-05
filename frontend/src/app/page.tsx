import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Web3 Marketplace</h1>
      <div className="flex space-x-4">
        <Link href="/listing?id=1" passHref>
          <Button variant="outline">View Sample Listing</Button>
        </Link>
        <Link href="/create-listing" passHref>
          <Button>Create New Listing</Button>
        </Link>
      </div>
    </main>
  )
}