"use client"

import { useState } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const usdcTokenAddress = '0x02b1E56b78923913C5628fD4a26B566941844d38'

const usdcAbi = [
  "function mint(address to, uint256 amount) public",
  "function balanceOf(address account) public view returns (uint256)"
]

export default function USDCFaucet() {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) {
      setError('Please enter an amount')
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
      const usdcContract = new ethers.Contract(usdcTokenAddress, usdcAbi, signer)

      const amountInWei = ethers.utils.parseUnits(amount, 6) // USDC has 6 decimal places
      const tx = await usdcContract.mint(await signer.getAddress(), amountInWei)
      await tx.wait()

      const balance = await usdcContract.balanceOf(await signer.getAddress())
      const balanceInUSDC = ethers.utils.formatUnits(balance, 6)

      setSuccess(`Successfully minted ${amount} USDC. Your new balance is ${balanceInUSDC} USDC.`)
      setAmount('')
    } catch (err) {
      console.error('Error minting USDC:', err)
      if (err instanceof Error) {
        setError(`Failed to mint USDC: ${err.message}`)
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
        <CardTitle>USDC Faucet</CardTitle>
        <CardDescription>Mint USDC tokens for testing purposes</CardDescription>
      </CardHeader>
      <form onSubmit={handleMint}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to mint"
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
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Minting...' : 'Mint USDC'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}