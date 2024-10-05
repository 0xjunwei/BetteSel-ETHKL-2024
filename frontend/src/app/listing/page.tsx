"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, RefreshCw, PlusCircle } from 'lucide-react'

// Update this to your current contract address
const contractAddress = '0x3b2e82ac366B811fbA9e19484Bd7Dd586eB239Cc'
const rpcUrl = 'https://scroll-sepolia.chainstacklabs.com'

const abi = [
  {"type":"function","name":"listingCount","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"listings","inputs":[{"name":"","type":"uint256"}],"outputs":[{"name":"itemId","type":"uint256"},{"name":"itemTitle","type":"string"},{"name":"seller","type":"address"},{"name":"price","type":"uint256"},{"name":"ipfsLink","type":"string"},{"name":"listingStatus","type":"uint8"},{"name":"buyer","type":"address"},{"name":"encryptedBuyerAddress","type":"string"},{"name":"blockTimestampForDispute","type":"uint256"}],"stateMutability":"view"}
]

interface Listing {
  id: string;
  itemTitle: string;
  seller: string;
  price: string;
  status: number;
}

const getStatusText = (status: number) => {
  switch (status) {
    case 0: return 'Unsold'
    case 1: return 'Bid Accepted'
    case 2: return 'In Dispute'
    case 3: return 'Sold and Completed'
    case 4: return 'Cancelled'
    case 5: return 'Delivered Awaiting Buyer Release'
    default: return 'Unknown'
  }
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const router = useRouter()

  const fetchListings = async () => {
    let tempDebugInfo = ''
    try {
      setLoading(true)
      setError(null)
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      const contract = new ethers.Contract(contractAddress, abi, provider)

      tempDebugInfo += `Connected to contract at ${contractAddress}\n`

      const listingCount = await contract.listingCount()
      tempDebugInfo += `Total listing count: ${listingCount.toString()}\n`

      const fetchedListings: Listing[] = []

      for (let i = 1; i <= listingCount.toNumber(); i++) {
        tempDebugInfo += `Fetching listing ${i}...\n`
        const listing = await contract.listings(i)
        tempDebugInfo += `Listing ${i} data: ${JSON.stringify(listing)}\n`
        
        if (listing.itemId.toNumber() !== 0) {
          fetchedListings.push({
            id: listing.itemId.toString(),
            itemTitle: listing.itemTitle,
            seller: listing.seller,
            price: ethers.utils.formatUnits(listing.price, 6),
            status: listing.listingStatus
          })
          tempDebugInfo += `Listing ${i} added to fetchedListings\n`
        } else {
          tempDebugInfo += `Listing ${i} skipped (itemId is 0)\n`
        }
      }

      setListings(fetchedListings)
      tempDebugInfo += `Total fetched listings: ${fetchedListings.length}\n`
    } catch (err) {
      console.error('Error fetching listings:', err)
      setError('Failed to fetch listings. Please try again later.')
      tempDebugInfo += `Error: ${err instanceof Error ? err.message : String(err)}\n`
    } finally {
      setLoading(false)
      setDebugInfo(tempDebugInfo)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchListings()
    router.refresh()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-lg text-primary">Loading listings...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Available Listings</h1>
        <div className="space-x-2">
          <Button onClick={handleRefresh} disabled={refreshing} className="bg-primary text-primary-foreground">
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Listings
              </>
            )}
          </Button>
          <Link href="/create-listing" passHref>
            <Button className="bg-secondary text-secondary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Listing
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {listings.length === 0 ? (
        <Card className="bg-muted">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-center text-muted-foreground mb-4">No listings available at the moment.</p>
            <Link href="/create-listing" passHref>
              <Button className="bg-primary text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle>{listing.itemTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                <p>Price: {listing.price} USDC</p>
                <p>Status: {getStatusText(listing.status)}</p>
              </CardContent>
              <CardFooter>
                <Link href={`/listing/${listing.id}`} passHref>
                  <Button className="w-full bg-primary text-primary-foreground">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Debug Information */}
      <details className="mt-8 p-4 bg-gray-100 rounded-lg">
        <summary className="font-bold cursor-pointer">Debug Information</summary>
        <pre className="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
      </details>
    </div>
  )
}