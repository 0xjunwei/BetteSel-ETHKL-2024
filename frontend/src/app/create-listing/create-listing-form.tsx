"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const contractAddress = '0xbAA95dbE2472a12255031BB34999C5C2017ccCDC'

const abi = [{"type":"function","name":"addListing","inputs":[{"name":"_price","type":"uint256","internalType":"uint256"},{"name":"_itemTitle","type":"string","internalType":"string"},{"name":"_ipfsLink","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"}]

export default function CreateListingForm() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [ipfsLink, setIpfsLink] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)

  const router = useRouter()

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const accounts = await provider.listAccounts()
        setWalletConnected(accounts.length > 0)
      } catch (err) {
        console.error("Failed to check wallet connection:", err)
        setWalletConnected(false)
      }
    } else {
      setWalletConnected(false)
    }
  }

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

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error("No ethereum wallet found")
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, abi, signer)

      const priceInWei = ethers.utils.parseEther(price)
      const tx = await contract.addListing(priceInWei, title, ipfsLink)
      await tx.wait()

      setSuccess('Listing created successfully!')
      setTitle('')
      setPrice('')
      setIpfsLink('')

      // Redirect to the listings page after a short delay
      setTimeout(() => {
        router.push('/listings')
      }, 2000)
    } catch (err) {
      console.error(err)
      setError('Failed to create listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your Ethereum wallet to create a listing.
          </AlertDescription>
        </Alert>
        <Button onClick={checkWalletConnection}>Connect Wallet</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter listing title"
          required
        />
      </div>
      <div>
        <Label htmlFor="price">Price (ETH)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Enter price in ETH"
          required
        />
      </div>
      <div>
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
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Listing'}
      </Button>
    </form>
  )
}