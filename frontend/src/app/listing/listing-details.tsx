"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ImageOff } from 'lucide-react'

const contractAddress = '0xbAA95dbE2472a12255031BB34999C5C2017ccCDC'
const usdcTokenAddress = '0x02b1E56b78923913C5628fD4a26B566941844d38'
const rpcUrl = 'https://scroll-sepolia.chainstacklabs.com'

const abi = [{"type":"function","name":"listings","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"itemId","type":"uint256","internalType":"uint256"},{"name":"itemTitle","type":"string","internalType":"string"},{"name":"seller","type":"address","internalType":"address"},{"name":"price","type":"uint256","internalType":"uint256"},{"name":"ipfsLink","type":"string","internalType":"string"},{"name":"listingStatus","type":"uint8","internalType":"uint8"},{"name":"buyer","type":"address","internalType":"address"},{"name":"encryptedBuyerAddress","type":"string","internalType":"string"},{"name":"blockTimestampForDispute","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"bidForListing","inputs":[{"name":"_listingID","type":"uint256","internalType":"uint256"},{"name":"_bidPrice","type":"uint256","internalType":"uint256"},{"name":"_encryptedAddress","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"walletToPublicKey","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"}]

const erc20Abi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)"
]

interface ListingType {
  itemId: string;
  itemTitle: string;
  seller: string;
  price: string;
  ipfsLink: string;
  listingStatus: number;
  buyer: string;
  encryptedBuyerAddress: string;
  blockTimestampForDispute: string;
}

export default function ListingDetails() {
  const [listing, setListing] = useState<ListingType | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [encryptedAddress, setEncryptedAddress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [sellerPublicKey, setSellerPublicKey] = useState('')

  const searchParams = useSearchParams()
  const listingId = searchParams ? searchParams.get('id') : null

  useEffect(() => {
    const fetchListingDetails = async () => {
      if (!listingId) return

      try {
        setLoading(true)
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        const contract = new ethers.Contract(contractAddress, abi, provider)
        const listingDetails = await contract.listings(listingId)
        setListing({
          itemId: listingDetails.itemId.toString(),
          itemTitle: listingDetails.itemTitle,
          seller: listingDetails.seller,
          price: ethers.utils.formatUnits(listingDetails.price, 6), // Format as USDC with 6 decimal places
          ipfsLink: listingDetails.ipfsLink,
          listingStatus: listingDetails.listingStatus,
          buyer: listingDetails.buyer,
          encryptedBuyerAddress: listingDetails.encryptedBuyerAddress,
          blockTimestampForDispute: new Date(listingDetails.blockTimestampForDispute.toNumber() * 1000).toLocaleString()
        })

        // Fetch seller's public key
        const sellerKey = await contract.walletToPublicKey(listingDetails.seller)
        setSellerPublicKey(sellerKey)
      } catch (err) {
        setError('Failed to fetch listing details. Please try again.')
        console.error('Error fetching listing details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchListingDetails()
  }, [listingId])

  useEffect(() => {
    if (listing && listing.ipfsLink) {
      const timer = setTimeout(() => {
        if (imageLoading) {
          setImageError(true)
          setImageLoading(false)
        }
      }, 10000) // 10 seconds timeout

      return () => clearTimeout(timer)
    }
  }, [listing, imageLoading])

  const handleBid = async () => {
    if (!listing || !bidAmount || !encryptedAddress) {
      setError('Please enter bid amount and encrypted address.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (typeof window.ethereum === 'undefined') {
        throw new Error('Ethereum provider not found. Please install MetaMask or another Web3 wallet.')
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
      await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()
      const usdcContract = new ethers.Contract(usdcTokenAddress, erc20Abi, signer)
      const marketContract = new ethers.Contract(contractAddress, abi, signer)

      const bidAmountInUSDC = ethers.utils.parseUnits(bidAmount, 6) // Convert to USDC with 6 decimal places
      const userAddress = await signer.getAddress()

      // Check user's USDC balance
      const balance = await usdcContract.balanceOf(userAddress)
      if (balance.lt(bidAmountInUSDC)) {
        setError('Insufficient USDC balance. Please add more funds to your wallet.')
        return
      }

      // Check current allowance
      const currentAllowance = await usdcContract.allowance(userAddress, contractAddress)

      // If current allowance is less than bid amount, request approval
      if (currentAllowance.lt(bidAmountInUSDC)) {
        console.log('Requesting approval...')
        try {
          const approveTx = await usdcContract.approve(contractAddress, bidAmountInUSDC)
          await approveTx.wait()
          console.log('Approval granted successfully')
        } catch (approvalError) {
          console.error('Error during approval:', approvalError)
          setError('Failed to approve USDC transfer. Please try again.')
          return
        }
      }

      // Place bid
      console.log('Placing bid...')
      const gasLimit = await marketContract.estimateGas.bidForListing(listing.itemId, bidAmountInUSDC, encryptedAddress)
      const tx = await marketContract.bidForListing(listing.itemId, bidAmountInUSDC, encryptedAddress, {
        gasLimit: gasLimit.mul(120).div(100) // Add 20% buffer to the estimated gas limit
      })
      await tx.wait()

      setSuccess('Bid placed successfully!')
      setBidAmount('')
      setEncryptedAddress('')
      
      // Refresh listing details after successful bid
      const updatedListing = await marketContract.listings(listingId)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
        buyer: updatedListing.buyer,
        encryptedBuyerAddress: updatedListing.encryptedBuyerAddress,
      })
    } catch (err: unknown) {
      console.error('Error placing bid:', err)
      if (typeof err === 'object' && err !== null) {
        if ('code' in err && typeof err.code === 'number') {
          if (err.code === 4001) {
            setError('Transaction was rejected by the user.')
          } else if (err.code === -32603) {
            setError('Internal error. Please check your wallet balance and try again.')
          }
        }
        if ('message' in err && typeof err.message === 'string') {
          if (err.message.includes('UNPREDICTABLE_GAS_LIMIT')) {
            setError('Unable to estimate gas. The transaction might fail or the contract might be paused. Please try again later or contact support.')
          } else {
            setError(`Failed to place bid: ${err.message}`)
          }
        }
      } else {
        setError('An unknown error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!listing) {
    return <div className="flex justify-center items-center h-screen">No listing found</div>
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Listing Details</CardTitle>
        <CardDescription>View details and place bid for listing {listingId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="itemTitle">Item Title</Label>
            <Input id="itemTitle" value={listing.itemTitle} readOnly />
          </div>
          <div>
            <Label htmlFor="seller">Seller</Label>
            <Input id="seller" value={listing.seller} readOnly />
          </div>
          <div>
            <Label htmlFor="sellerPublicKey">Seller&apos;s Public Key</Label>
            <Input id="sellerPublicKey" value={sellerPublicKey} readOnly />
          </div>
          <div>
            <Label htmlFor="price">Price (USDC)</Label>
            <Input id="price" value={listing.price} readOnly />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Input 
              id="status" 
              value={listing.listingStatus === 0 ? 'Active' : listing.listingStatus === 1 ? 'Pending Delivery' : 'Inactive'} 
              readOnly 
            />
          </div>
          <div>
            <Label>Item Image</Label>
            <div className="mt-2 relative w-full h-64 bg-gray-100 rounded-md overflow-hidden">
              {listing.ipfsLink && !imageError ? (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-500">Loading image...</span>
                    </div>
                  )}
                  <Image
                    src={listing.ipfsLink}
                    alt={listing.itemTitle}
                    fill
                    style={{ objectFit: 'contain' }}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageError(true)
                      setImageLoading(false)
                    }}
                    className={imageLoading ? 'hidden' : 'block'}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <ImageOff className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-500">
                    {imageError ? 'Failed to load image' : 'No image available'}
                  </span>
                </div>
              )}
            </div>
          </div>
          {listing.listingStatus === 0 ? (
            <>
              <div>
                <Label htmlFor="bidAmount">Your Bid Amount (USDC)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount in USDC"
                />
              </div>
              <div>
                <Label htmlFor="encryptedAddress">Your Encrypted Address</Label>
                <Input
                  id="encryptedAddress"
                  value={encryptedAddress}
                  onChange={(e) => setEncryptedAddress(e.target.value)}
                  placeholder="Enter your encrypted address"
                />
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="encryptedBuyerAddress">Encrypted Buyer Address</Label>
              <Input id="encryptedBuyerAddress" value={listing.encryptedBuyerAddress} readOnly />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {listing.listingStatus === 0 && (
          <Button onClick={handleBid} disabled={loading}>
            {loading ? 'Placing Bid...' : 'Place Bid'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}