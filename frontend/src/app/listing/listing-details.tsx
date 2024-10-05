"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ImageOff } from 'lucide-react'

const contractAddress = '0xeFd78e5913CfC7B50e4eD66AccaC8C59C15ab478'
const usdcTokenAddress = '0x02b1E56b78923913C5628fD4a26B566941844d38'
const rpcUrl = 'https://scroll-sepolia.chainstacklabs.com'

const abi = [
  {"type":"function","name":"listings","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"itemId","type":"uint256","internalType":"uint256"},{"name":"itemTitle","type":"string","internalType":"string"},{"name":"seller","type":"address","internalType":"address"},{"name":"price","type":"uint256","internalType":"uint256"},{"name":"ipfsLink","type":"string","internalType":"string"},{"name":"listingStatus","type":"uint8","internalType":"uint8"},{"name":"buyer","type":"address","internalType":"address"},{"name":"encryptedBuyerAddress","type":"string","internalType":"string"},{"name":"blockTimestampForDispute","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"bidForListing","inputs":[{"name":"_listingID","type":"uint256","internalType":"uint256"},{"name":"_bidPrice","type":"uint256","internalType":"uint256"},{"name":"_encryptedAddress","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"walletToPublicKey","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},
  {"type":"function","name":"releasePaymentToSeller","inputs":[{"name":"_listingID","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"submitProofOfDelivery","inputs":[{"name":"_listingID","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"listingBids","inputs":[{"name":"","type":"uint256"},{"name":"","type":"uint256"}],"outputs":[{"name":"bidder","type":"address","internalType":"address"},{"name":"bidAmount","type":"uint256","internalType":"uint256"},{"name":"encryptedBidderAddress","type":"string","internalType":"string"}],"stateMutability":"view"},
  {"type":"function","name":"acceptBid","inputs":[{"name":"_listingID","type":"uint256","internalType":"uint256"},{"name":"_bidder","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"raiseDispute","inputs":[{"name":"_listingID","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"adminAccess","inputs":[{"name":"","type":"address"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"resolveDispute","inputs":[{"name":"_listingID","type":"uint256"},{"name":"sendToSeller","type":"bool"}],"outputs":[],"stateMutability":"nonpayable"}
]

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

interface BidType {
  bidder: string;
  bidAmount: string;
  encryptedBidderAddress: string;
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

interface ListingDetailsProps {
  id: string;
}

export default function ListingDetails({ id }: ListingDetailsProps) {
  const [listing, setListing] = useState<ListingType | null>(null)
  const [bids, setBids] = useState<BidType[]>([])
  const [bidAmount, setBidAmount] = useState('')
  const [encryptedAddress, setEncryptedAddress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [sellerPublicKey, setSellerPublicKey] = useState('')
  const [userAddress, setUserAddress] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchBids = async (contract: ethers.Contract, listingId: string) => {
    try {
      let index = 0
      const fetchedBids: BidType[] = []
      while (true) {
        try {
          const bid = await contract.listingBids(listingId, index)
          if (bid.bidder === ethers.constants.AddressZero) break
          fetchedBids.push({
            bidder: bid.bidder,
            bidAmount: ethers.utils.formatUnits(bid.bidAmount, 6),
            encryptedBidderAddress: bid.encryptedBidderAddress
          })
          index++
        } catch (error) {
          console.error('Error fetching bid:', error)
          break
        }
      }
      setBids(fetchedBids)
    } catch (error) {
      console.error('Error fetching bids:', error)
    }
  }

  useEffect(() => {
    const fetchListingDetails = async () => {
      if (!id) return

      try {
        setLoading(true)
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        const contract = new ethers.Contract(contractAddress, abi, provider)
        const listingDetails = await contract.listings(id)
        setListing({
          itemId: listingDetails.itemId.toString(),
          itemTitle: listingDetails.itemTitle,
          seller: listingDetails.seller,
          price: ethers.utils.formatUnits(listingDetails.price, 6),
          ipfsLink: listingDetails.ipfsLink,
          listingStatus: listingDetails.listingStatus,
          buyer: listingDetails.buyer,
          encryptedBuyerAddress: listingDetails.encryptedBuyerAddress,
          blockTimestampForDispute: new Date(listingDetails.blockTimestampForDispute.toNumber() * 1000).toLocaleString()
        })

        const sellerKey = await contract.walletToPublicKey(listingDetails.seller)
        setSellerPublicKey(sellerKey)

        if (typeof window.ethereum !== 'undefined') {
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
          const signer = web3Provider.getSigner()
          const address = await signer.getAddress()
          setUserAddress(address)
        }

        await fetchBids(contract, id)
      } catch (err) {
        setError('Failed to fetch listing details. Please try again.')
        console.error('Error fetching listing details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchListingDetails()
  }, [id])

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (typeof window.ethereum !== 'undefined' && userAddress) {
        const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
        const contract = new ethers.Contract(contractAddress, abi, provider)
        const adminStatus = await contract.adminAccess(userAddress)
        setIsAdmin(adminStatus)
      }
    }

    checkAdminStatus()
  }, [userAddress])

  useEffect(() => {
    if (listing && listing.ipfsLink) {
      const timer = setTimeout(() => {
        if (imageLoading) {
          setImageError(true)
          setImageLoading(false)
        }
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [listing, imageLoading])

  const handleBid = async () => {
    if (!listing || !bidAmount || !encryptedAddress || !id) {
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

      const bidAmountInUSDC = ethers.utils.parseUnits(bidAmount, 6)
      const userAddress = await signer.getAddress()

      const balance = await usdcContract.balanceOf(userAddress)
      if (balance.lt(bidAmountInUSDC)) {
        setError('Insufficient USDC balance. Please add more funds to your wallet.')
        return
      }

      const currentAllowance = await usdcContract.allowance(userAddress, contractAddress)

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

      console.log('Placing bid...')
      const gasLimit = await marketContract.estimateGas.bidForListing(listing.itemId, bidAmountInUSDC, encryptedAddress)
      const tx = await marketContract.bidForListing(listing.itemId, bidAmountInUSDC, encryptedAddress, {
        gasLimit: gasLimit.mul(120).div(100)
      })
      await tx.wait()

      setSuccess('Bid placed successfully!')
      setBidAmount('')
      setEncryptedAddress('')
      
      const updatedListing = await marketContract.listings(id)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
        buyer: updatedListing.buyer,
        encryptedBuyerAddress: updatedListing.encryptedBuyerAddress,
      })
      await fetchBids(marketContract, id)
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

  const handleReleasePayment = async () => {
    if (!listing || !id) {
      setError('Listing information is missing.')
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
      const marketContract = new ethers.Contract(contractAddress, abi, signer)

      console.log('Releasing payment...')
      const gasLimit = await marketContract.estimateGas.releasePaymentToSeller(id)
      const tx = await marketContract.releasePaymentToSeller(id, {
        gasLimit: gasLimit.mul(120).div(100)
      })
      await tx.wait()

      setSuccess('Payment released successfully!')
      
      const updatedListing = await marketContract.listings(id)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
      })
    } catch (err: unknown) {
      console.error('Error releasing payment:', err)
      if (typeof err === 'object' && err !== null) {
        if ('code' in err && typeof err.code === 'number') {
          if (err.code === 4001) {
            setError('Transaction was rejected by the user.')
          } else if (err.code === -32603) {
            setError('Internal error. Please try again.')
          }
        }
        if ('message' in err && typeof err.message === 'string') {
          setError(`Failed to release payment: ${err.message}`)
        }
      } else {
        setError('An unknown error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitProofOfDelivery = async () => {
    if (!listing || !id) {
      setError('Listing information is missing.')
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
      const marketContract = new ethers.Contract(contractAddress, abi, signer)

      console.log('Submitting proof of delivery...')
      const gasLimit = await marketContract.estimateGas.submitProofOfDelivery(id)
      const tx = await marketContract.submitProofOfDelivery(id, {
        gasLimit: gasLimit.mul(120).div(100)
      })
      await tx.wait()

      setSuccess('Proof of delivery submitted successfully!')
      
      const updatedListing = await marketContract.listings(id)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
      })
    } catch (err: unknown) {
      console.error('Error submitting proof of delivery:', err)
      if (typeof err === 'object' && err !== null) {
        if ('code' in err && typeof err.code === 'number') {
          if (err.code === 4001) {
            setError('Transaction was rejected by the user.')
          } else if (err.code === -32603) {
            setError('Internal error. Please try again.')
          }
        }
        if ('message' in err && typeof err.message === 'string') {
          setError(`Failed to submit proof of delivery: ${err.message}`)
        }
      } else {
        setError('An unknown error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptBid = async (bidder: string) => {
    if (!listing || !id) {
      setError('Listing information is missing.')
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
      const marketContract = new ethers.Contract(contractAddress, abi, signer)

      console.log('Accepting bid...')
      const gasLimit = await marketContract.estimateGas.acceptBid(id, bidder)
      const tx = await marketContract.acceptBid(id, bidder, {
        gasLimit: gasLimit.mul(120).div(100)
      })
      await tx.wait()

      setSuccess('Bid accepted successfully!')
      
      const updatedListing = await marketContract.listings(id)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
        buyer: updatedListing.buyer,
        encryptedBuyerAddress: updatedListing.encryptedBuyerAddress,
      })
      await fetchBids(marketContract, id)
    } catch (err: unknown) {
      console.error('Error accepting bid:', err)
      if (typeof err === 'object' && err !== null) {
        if ('code' in err && typeof err.code === 'number') {
          if (err.code === 4001) {
            setError('Transaction was rejected by the user.')
          } else if (err.code === -32603) {
            setError('Internal error. Please try again.')
          }
        }
        if ('message' in err && typeof err.message === 'string') {
          setError(`Failed to accept bid: ${err.message}`)
        }
      } else {
        setError('An unknown error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDisputeTransaction = async () => {
    if (!listing || !id) {
      setError('Listing information is missing.')
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
      const marketContract = new ethers.Contract(contractAddress, abi, signer)

      console.log('Raising dispute...')
      const gasLimit = await marketContract.estimateGas.raiseDispute(id)
      const tx = await marketContract.raiseDispute(id, {
        gasLimit: gasLimit.mul(120).div(100)
      })
      await tx.wait()

      setSuccess('Dispute raised successfully!')
      
      const updatedListing = await marketContract.listings(id)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
      })
    } catch (err: unknown) {
      console.error('Error raising dispute:', err)
      if (typeof err === 'object' && err !== null) {
        if ('code' in err && typeof err.code === 'number') {
          if (err.code === 4001) {
            setError('Transaction was rejected by the user.')
          } else if (err.code === -32603) {
            setError('Internal error. Please try again.')
          }
        }
        if ('message' in err && typeof err.message === 'string') {
          setError(`Failed to raise dispute: ${err.message}`)
        }
      } else {
        setError('An unknown error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResolveDispute = async (sendToSeller: boolean) => {
    if (!listing || !id) {
      setError('Listing information is missing.')
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
      const marketContract = new ethers.Contract(contractAddress, abi, signer)

      console.log('Resolving dispute...')
      const gasLimit = await marketContract.estimateGas.resolveDispute(id, sendToSeller)
      const tx = await marketContract.resolveDispute(id, sendToSeller, {
        gasLimit: gasLimit.mul(120).div(100)
      })
      await tx.wait()

      setSuccess(`Dispute resolved in favor of the ${sendToSeller ? 'seller' : 'buyer'}!`)
      
      const updatedListing = await marketContract.listings(id)
      setListing({
        ...listing,
        listingStatus: updatedListing.listingStatus,
      })
    } catch (err: unknown) {
      console.error('Error resolving dispute:', err)
      if (typeof err === 'object' && err !== null) {
        if ('code' in err && typeof err.code === 'number') {
          if (err.code === 4001) {
            setError('Transaction was rejected by the user.')
          } else if (err.code === -32603) {
            setError('Internal error. Please try again.')
          }
        }
        if ('message' in err && typeof err.message === 'string') {
          setError(`Failed to resolve dispute: ${err.message}`)
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

  const isUserBuyer = listing.buyer.toLowerCase() === userAddress.toLowerCase()
  const isUserSeller = listing.seller.toLowerCase() === userAddress.toLowerCase()

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 bg-gray-900 text-white">
      <CardHeader>
        <CardTitle>Listing Details</CardTitle>
        <CardDescription className="text-gray-300">View details and place bid for listing {id}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="itemTitle" className="text-gray-300">Item Title</Label>
            <Input id="itemTitle" value={listing.itemTitle} readOnly className="bg-gray-800 text-white" />
          </div>
          <div>
            <Label htmlFor="seller" className="text-gray-300">Seller</Label>
            <Input id="seller" value={listing.seller} readOnly className="bg-gray-800 text-white" />
          </div>
          <div>
            <Label htmlFor="sellerPublicKey" className="text-gray-300">Seller&apos;s Public Key</Label>
            <Input id="sellerPublicKey" value={sellerPublicKey} readOnly className="bg-gray-800 text-white" />
          </div>
          <div>
            <Label htmlFor="price" className="text-gray-300">Price (USDC)</Label>
            <Input id="price" value={listing.price} readOnly className="bg-gray-800 text-white" />
          </div>
          <div>
            <Label htmlFor="status" className="text-gray-300">Status</Label>
            <Input 
              id="status" 
              value={getStatusText(listing.listingStatus)}
              readOnly 
              className="bg-gray-800 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Item Image</Label>
            <div className="mt-2 relative w-full h-64 bg-gray-800 rounded-md overflow-hidden">
              {listing.ipfsLink ? (
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
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <ImageOff className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                  <span className="text-gray-300">Loading image...</span>
                </div>
              )}
              {imageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <ImageOff className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-400">Failed to load image</span>
                </div>
              )}
            </div>
          </div>
          {listing.listingStatus === 0 ? (
            <>
              <div>
                <Label htmlFor="bidAmount" className="text-gray-300">Your Bid Amount (USDC)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount in USDC"
                  className="bg-gray-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="encryptedAddress" className="text-gray-300">Your Encrypted Address</Label>
                <Input
                  id="encryptedAddress"
                  value={encryptedAddress}
                  onChange={(e) => setEncryptedAddress(e.target.value)}
                  placeholder="Enter your encrypted address"
                  className="bg-gray-800 text-white"
                />
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="encryptedBuyerAddress" className="text-gray-300">Encrypted Buyer Address</Label>
              <Input id="encryptedBuyerAddress" value={listing.encryptedBuyerAddress || 'Not available'} readOnly className="bg-gray-800 text-white" />
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
          {listing.listingStatus === 0 && isUserSeller && bids.length > 0 && (
            <div>
              <Label className="text-gray-300">Available Bids</Label>
              <div className="mt-2 space-y-2">
                {bids.map((bid, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-200 rounded">
                    <span className="text-gray-800">{bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)} - {bid.bidAmount} USDC</span>
                    <Button onClick={() => handleAcceptBid(bid.bidder)} disabled={loading} variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">
                      Accept Bid
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 justify-center">
        {listing.listingStatus === 0 && !isUserSeller && (
          <Button onClick={handleBid} disabled={loading} className="bg-blue-500 text-white hover:bg-blue-600">
            {loading ? 'Placing Bid...' : 'Place Bid'}
          </Button>
        )}
        {listing.listingStatus === 1 && isUserSeller && (
          <Button onClick={handleSubmitProofOfDelivery} disabled={loading} className="bg-green-500 text-white hover:bg-green-600">
            {loading ? 'Submitting Proof...' : 'Submit Proof of Delivery'}
          </Button>
        )}
        {(listing.listingStatus === 1 || listing.listingStatus === 5) && isUserBuyer && (
          <Button onClick={handleReleasePayment} disabled={loading} className="bg-yellow-500 text-white hover:bg-yellow-600">
            {loading ? 'Releasing Payment...' : 'Release Payment to Seller'}
          </Button>
        )}
        {(listing.listingStatus === 1 || listing.listingStatus === 5) && (isUserBuyer || isUserSeller) && (
          <Button onClick={handleDisputeTransaction} disabled={loading} className="bg-red-500 text-white hover:bg-red-600">
            {loading ? 'Raising Dispute...' : 'Dispute Transaction'}
          </Button>
        )}
        {listing.listingStatus === 2 && isAdmin && (
          <>
            <Button 
              onClick={() => handleResolveDispute(true)} 
              disabled={loading} 
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {loading ? 'Resolving...' : 'Resolve for Seller'}
            </Button>
            <Button 
              onClick={() => handleResolveDispute(false)} 
              disabled={loading} 
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {loading ? 'Resolving...' : 'Resolve for Buyer'}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}