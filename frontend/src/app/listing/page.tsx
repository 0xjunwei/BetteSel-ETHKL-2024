"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, RefreshCw, PlusCircle } from 'lucide-react'

const contractAddress = '0xb1E71c74cB1f33FbBe653ee15f01151f5730fE85'
const rpcUrl = 'https://scroll-sepolia.chainstacklabs.com'

const abi = [
  {"type":"function","name":"listingCount","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"listings","inputs":[{"name":"","type":"uint256"}],"outputs":[{"name":"itemId","type":"uint256"},{"name":"itemTitle","type":"string"},{"name":"seller","type":"address"},{"name":"price","type":"uint256"},{"name":"ipfsLink","type":"string"},{"name":"listingStatus","type":"uint8"},{"name":"buyer","type":"address"},{"name":"encryptedBuyerAddress","type":"string"},{"name":"blockTimestampForDispute","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"bidForListing","inputs":[{"name":"_listingID","type":"uint256"},{"name":"_bidPrice","type":"uint256"},{"name":"_encryptedAddress","type":"string"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"walletToPublicKey","inputs":[{"name":"","type":"address"}],"outputs":[{"name":"","type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"releasePaymentToSeller","inputs":[{"name":"_listingID","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"submitProofOfDelivery","inputs":[{"name":"_listingID","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"listingBids","inputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"outputs":[{"name":"bidder","type":"address"},{"name":"bidAmount","type":"uint256"},{"name":"encryptedBidderAddress","type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"acceptBid","inputs":[{"name":"_listingID","type":"uint256"},{"name":"_bidder","type":"address"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"raiseDispute","inputs":[{"name":"_listingID","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"adminAccess","inputs":[{"name":"","type":"address"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"resolveDispute","inputs":[{"name":"_listingID","type":"uint256"},{"name":"sendToSeller","type":"bool"}],"outputs":[],"stateMutability":"nonpayable"}
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

  const fetchListings = async () => {
    try {
      setLoading(true)
      setError(null)
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      const contract = new ethers.Contract(contractAddress, abi, provider)

      const listingCount = await contract.listingCount()
      const fetchedListings: Listing[] = []

      for (let i = 0; i < listingCount.toNumber(); i++) {
        try {
          const listing = await contract.listings(i)
          // Remove the check for itemId !== 0
          fetchedListings.push({
            id: listing.itemId.toString(),
            itemTitle: listing.itemTitle,
            seller: listing.seller,
            price: ethers.utils.formatUnits(listing.price, 6),
            status: listing.listingStatus
          })
        } catch (listingError) {
          console.error(`Error fetching listing ${i}:`, listingError)
        }
      }

      setListings(fetchedListings)
    } catch (err) {
      console.error('Error fetching listings:', err)
      setError('Failed to fetch listings. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchListings()
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
                <p>Listing ID: {listing.id}</p>
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
    </div>
  )
}