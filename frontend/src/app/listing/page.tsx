"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const contractAddress = '0xeFd78e5913CfC7B50e4eD66AccaC8C59C15ab478'
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

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        setError(null)
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        const contract = new ethers.Contract(contractAddress, abi, provider)

        const listingCount = await contract.listingCount()
        const fetchedListings: Listing[] = []

        for (let i = 1; i <= listingCount.toNumber(); i++) {
          const listing = await contract.listings(i)
          if (listing.itemId.toNumber() !== 0) {  // Check if the listing exists
            fetchedListings.push({
              id: listing.itemId.toString(),
              itemTitle: listing.itemTitle,
              seller: listing.seller,
              price: ethers.utils.formatUnits(listing.price, 6),
              status: listing.listingStatus
            })
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

    fetchListings()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Available Listings</h1>
      {listings.length === 0 ? (
        <p className="text-center text-gray-500">No listings available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} className="bg-gray-800 text-white">
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
                  <Button className="w-full">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}