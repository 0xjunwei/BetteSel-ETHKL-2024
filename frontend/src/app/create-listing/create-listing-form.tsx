"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const contractAddress = '0xbAA95dbE2472a12255031BB34999C5C2017ccCDC'
const rpcUrl = 'https://scroll-sepolia.chainstacklabs.com'

const abi = [{"type":"function","name":"addListing","inputs":[{"name":"_price","type":"uint256","internalType":"uint256"},{"name":"_itemTitle","type":"string","internalType":"string"},{"name":"_ipfsLink","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"}]

export default function CreateListingForm() {
  const [itemTitle, setItemTitle] = useState('')
  const [price, setPrice] = useState('')
  const [ipfsLink, setIpfsLink] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')

  const router = useRouter()

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setWalletConnected(true)
          setWalletAddress(accounts[0])
        }
      } catch (err) {
        console.error("Failed to check wallet connection", err)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        const address = await signer.getAddress()
        setWalletConnected(true)
        setWalletAddress(address)
      } catch (err) {
        setError('Failed to connect wallet. Please try again.')
        console.error(err)
      }
    } else {
      setError('Please install MetaMask!')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemTitle || !price || !ipfsLink) {
      setError('Please fill in all fields')
      return
    }

    if (!walletConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, abi, signer)

      // Convert price to USDC with 6 decimal places
      const priceInUSDC = ethers.utils.parseUnits(price, 6)

      const tx = await contract.addListing(priceInUSDC, itemTitle, ipfsLink)
      await tx.wait()

      setSuccess('Listing created successfully!')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      setError('Failed to create listing. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Listing</CardTitle>
        <CardDescription>Fill in the details to create a new listing</CardDescription>
      </CardHeader>
      <CardContent>
        {!walletConnected ? (
          <div className="text-center">
            <p className="mb-4">Please connect your wallet to create a listing</p>
            <Button onClick={connectWallet}>Connect Wallet</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="itemTitle">Item Title</Label>
              <Input
                id="itemTitle"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Enter item title"
                required
              />
            </div>
            <div>
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
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Listing...' : 'Create Listing'}
            </Button>
          </form>
        )}
      </CardContent>
      {walletConnected && (
        <CardFooter>
          <p className="text-sm text-gray-500">Connected Wallet: {walletAddress}</p>
        </CardFooter>
      )}
    </Card>
  )
}