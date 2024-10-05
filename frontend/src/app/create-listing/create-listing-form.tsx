"use client"

import { useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


const contractAddress = '0xbE0a3A6c2AceEA54b4DD3891b1A5c62a32336F5A'

const abi = [{"type":"function","name":"addListing","inputs":[{"name":"_price","type":"uint256","internalType":"uint256"},{"name":"_itemTitle","type":"string","internalType":"string"},{"name":"_ipfsLink","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"}]

export default function CreateListingForm() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [ipfsLink, setIpfsLink] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !price || !ipfsLink) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (typeof window.ethereum === 'undefined') {
        throw new Error('Ethereum provider not found. Please install MetaMask or another Web3 wallet.')
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, abi, signer)

      // Convert price to wei (assuming price is in USDC with 6 decimal places)
      const priceInWei = ethers.utils.parseUnits(price, 6)

      const tx = await contract.addListing(priceInWei, title, ipfsLink)
      await tx.wait()

      setSuccess('Listing created successfully!')
      setTitle('')
      setPrice('')
      setIpfsLink('')

      // Redirect to home page after successful listing creation
      router.push('/')
    } catch (err) {
      console.error('Error creating listing:', err)
      if (err instanceof Error) {
        setError(`Failed to create listing: ${err.message}`)
      } else {
        setError('An unknown error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Create New Listing</CardTitle>
        <CardDescription>Fill in the details to create a new listing</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter listing title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (USDC)</Label>
            <Input
              id="price"
              type="number"
              step="0.000001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price in USDC"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ipfsLink">IPFS Link</Label>
            <Input
              id="ipfsLink"
              value={ipfsLink}
              onChange={(e) => setIpfsLink(e.target.value)}
              placeholder="Enter IPFS link"
              required
            />
          </div>
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
        </CardContent>
        <Button type="submit" disabled={loading} className="w-full mt-4">
          {loading ? 'Creating...' : 'Create Listing'}
        </Button>
      </form>
    </Card>
  )
}