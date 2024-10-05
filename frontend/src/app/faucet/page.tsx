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
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
]

export default function Faucet() {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [balance, setBalance] = useState('')

  const mintTokens = async () => {
    if (!amount) {
      setError('Please enter an amount to mint.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()
      const usdcContract = new ethers.Contract(usdcTokenAddress, usdcAbi, signer)

      const decimals = await usdcContract.decimals()
      const mintAmount = ethers.utils.parseUnits(amount, decimals)

      const tx = await usdcContract.mint(await signer.getAddress(), mintAmount)
      await tx.wait()

      setSuccess(`Successfully minted ${amount} USDC tokens!`)
      setAmount('')

      // Update balance
      const newBalance = await usdcContract.balanceOf(await signer.getAddress())
      setBalance(ethers.utils.formatUnits(newBalance, decimals))
    } catch (err) {
      console.error(err)
      setError('Failed to mint tokens. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateBalance = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()
      const usdcContract = new ethers.Contract(usdcTokenAddress, usdcAbi, signer)

      const decimals = await usdcContract.decimals()
      const balance = await usdcContract.balanceOf(await signer.getAddress())
      setBalance(ethers.utils.formatUnits(balance, decimals))
    } catch (err) {
      console.error(err)
      setError('Failed to fetch balance. Please try again.')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>USDC Faucet</CardTitle>
          <CardDescription>Mint USDC tokens for testing purposes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Mint (USDC)</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount of USDC to mint"
              />
            </div>
            {balance && (
              <div>
                <Label>Your USDC Balance</Label>
                <Input value={balance} readOnly />
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
        <CardFooter className="flex justify-between">
          <Button onClick={mintTokens} disabled={loading}>
            {loading ? 'Minting...' : 'Mint Tokens'}
          </Button>
          <Button onClick={updateBalance} variant="outline">
            Update Balance
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}