"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'

const contractAddress = '0x3b2e82ac366B811fbA9e19484Bd7Dd586eB239Cc'
const rpcUrl = 'https://scroll-sepolia.chainstacklabs.com'

const abi = [
  {"type":"function","name":"listings","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"itemId","type":"uint256","internalType":"uint256"},{"name":"itemTitle","type":"string","internalType":"string"},{"name":"seller","type":"address","internalType":"address"},{"name":"price","type":"uint256","internalType":"uint256"},{"name":"ipfsLink","type":"string","internalType":"string"},{"name":"listingStatus","type":"uint8","internalType":"uint8"},{"name":"buyer","type":"address","internalType":"address"},{"name":"encryptedBuyerAddress","type":"string","internalType":"string"},{"name":"blockTimestampForDispute","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"listingCount","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"}
]

interface Listing {
  id: string;
  itemTitle: string;
  seller: string;
  price: string;
  listingStatus: number;
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

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        setError(null)
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        const contract = new ethers.Contract(contractAddress, abi, provider)

        const listingCount = await contract.listingCount()
        const fetchedListings: Listing[] = []

        for (let i = 0; i < listingCount.toNumber(); i++) {
          const listing = await contract.listings(i)
          fetchedListings.push({
            id: i.toString(),
            itemTitle: listing.itemTitle,
            seller: listing.seller,
            price: ethers.utils.formatUnits(listing.price, 6),
            listingStatus: listing.listingStatus
          })
        }

        setListings(fetchedListings)
      } catch (err) {
        console.error('Error fetching listings:', err)
        setError('Failed to fetch listings. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-white">Available Listings</h1>
      {listings.length === 0 ? (
        <p className="text-white">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="bg-gray-800 text-white">
              <CardHeader>
                <CardTitle>{listing.itemTitle}</CardTitle>
                <CardDescription className="text-gray-400">
                  Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Price: {listing.price} USDC</p>
                <p>Status: {getStatusText(listing.listingStatus)}</p>
              </CardContent>
              <CardFooter>
                <Link href={`/listing/details?id=${listing.id}`} passHref>
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}