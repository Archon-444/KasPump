import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Rocket,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  Coins,
  Image as ImageIcon,
  Settings,
  FileText,
  Sparkles,
  DollarSign
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface TokenData {
  name: string
  symbol: string
  description: string
  imageUrl: string
  curveType: 'linear' | 'exponential'
  basePrice: number
  slope: number
  initialSupply: number
  graduationThreshold: number
  maxSupply: number
}

const STEPS = [
  { id: 1, title: 'Token Basics', icon: FileText, description: 'Name, symbol, and description' },
  { id: 2, title: 'Branding', icon: ImageIcon, description: 'Visual identity' },
  { id: 3, title: 'Bonding Curve', icon: TrendingUp, description: 'Price discovery mechanism' },
  { id: 4, title: 'Supply Settings', icon: Coins, description: 'Initial and max supply' },
  { id: 5, title: 'Review & Launch', icon: Rocket, description: 'Final validation' },
]

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [tokenData, setTokenData] = useState<TokenData>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    curveType: 'linear',
    basePrice: 0.001,
    slope: 0.0001,
    initialSupply: 1000000,
    graduationThreshold: 100000,
    maxSupply: 10000000,
  })

  const updateTokenData = (field: keyof TokenData, value: any) => {
    setTokenData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const progress = (currentStep / STEPS.length) * 100

  // Validation logic
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return tokenData.name.length >= 2 && tokenData.symbol.length >= 2 && tokenData.description.length >= 10
      case 2:
        return tokenData.imageUrl.length > 0
      case 3:
        return tokenData.basePrice > 0 && tokenData.slope > 0
      case 4:
        return tokenData.initialSupply > 0 && tokenData.maxSupply >= tokenData.initialSupply
      case 5:
        return true
      default:
        return false
    }
  }, [currentStep, tokenData])

  // Calculate bonding curve data for preview
  const curveData = useMemo(() => {
    const points = 50
    const data = []
    const step = tokenData.maxSupply / points

    for (let i = 0; i <= points; i++) {
      const supply = i * step
      let price

      if (tokenData.curveType === 'linear') {
        price = tokenData.basePrice + (tokenData.slope * supply)
      } else {
        price = tokenData.basePrice * Math.pow(1 + tokenData.slope * 100, supply / 100000)
      }

      data.push({
        supply: Math.round(supply),
        price: Number(price.toFixed(6)),
        marketCap: supply * price,
      })
    }

    return data
  }, [tokenData.basePrice, tokenData.slope, tokenData.curveType, tokenData.maxSupply])

  // Calculate estimated costs
  const estimatedCosts = useMemo(() => {
    const deploymentFee = 0.05 // BNB
    const initialLiquidityUSD = tokenData.initialSupply * tokenData.basePrice * 400 // Assuming BNB = $400
    const platformFee = initialLiquidityUSD * 0.02

    return {
      deployment: deploymentFee,
      initialLiquidity: initialLiquidityUSD,
      platformFee,
      total: deploymentFee * 400 + initialLiquidityUSD + platformFee,
    }
  }, [tokenData.initialSupply, tokenData.basePrice])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="text-left mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">KasPump Token Launch Wizard</h1>
            </div>
            <p className="text-slate-600">Step-by-step guide to launching your token successfully</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 ${index < STEPS.length - 1 ? 'mr-2' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${currentStep >= step.id ? 'text-blue-600' : 'text-slate-400'}`}>
                    Step {step.id}
                  </div>
                  <div className={`h-1.5 rounded-full ${currentStep >= step.id ? 'bg-blue-600' : 'bg-slate-200'}`} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Badge variant={currentStep === STEPS.length ? "default" : "secondary"}>
                  {STEPS[currentStep - 1].title}
                </Badge>
                <span className="text-sm text-slate-600">{STEPS[currentStep - 1].description}</span>
              </div>
              <span className="text-sm font-medium text-slate-600">{Math.round(progress)}% Complete</span>
            </div>
          </div>

          {/* Step Content */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = STEPS[currentStep - 1].icon
                  return <Icon className="w-5 h-5 text-blue-600" />
                })()}
                <div>
                  <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                  <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Step 1: Token Basics */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="name">Token Name *</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The full name of your token (e.g., "Kaspa Pump Token")</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="name"
                      placeholder="e.g., My Awesome Token"
                      value={tokenData.name}
                      onChange={(e) => updateTokenData('name', e.target.value)}
                      className={tokenData.name.length >= 2 ? 'border-green-300' : ''}
                    />
                    {tokenData.name.length > 0 && tokenData.name.length < 2 && (
                      <p className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Minimum 2 characters
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="symbol">Token Symbol *</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Short ticker symbol (3-5 characters, e.g., "MAT")</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="symbol"
                      placeholder="e.g., MAT"
                      value={tokenData.symbol}
                      onChange={(e) => updateTokenData('symbol', e.target.value.toUpperCase())}
                      maxLength={5}
                      className={tokenData.symbol.length >= 2 ? 'border-green-300' : ''}
                    />
                    {tokenData.symbol.length > 0 && tokenData.symbol.length < 2 && (
                      <p className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Minimum 2 characters
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="description">Description *</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Brief description of your token's purpose and utility</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Describe your token's purpose, utility, and vision..."
                      value={tokenData.description}
                      onChange={(e) => updateTokenData('description', e.target.value)}
                      rows={4}
                      className={tokenData.description.length >= 10 ? 'border-green-300' : ''}
                    />
                    <div className="flex justify-between text-sm">
                      <span className={tokenData.description.length >= 10 ? 'text-green-600' : 'text-slate-500'}>
                        {tokenData.description.length < 10
                          ? `Minimum 10 characters (${10 - tokenData.description.length} more needed)`
                          : '✓ Description looks good'}
                      </span>
                      <span className="text-slate-400">{tokenData.description.length} characters</span>
                    </div>
                  </div>

                  {isStepValid && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Token basics configured successfully! Ready to proceed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Step 2: Branding */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="imageUrl">Token Image URL *</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Direct link to your token logo (PNG, JPG, or SVG)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/token-logo.png"
                      value={tokenData.imageUrl}
                      onChange={(e) => updateTokenData('imageUrl', e.target.value)}
                      className={tokenData.imageUrl.length > 0 ? 'border-green-300' : ''}
                    />
                  </div>

                  {tokenData.imageUrl && (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-sm font-medium text-slate-600">Preview:</div>
                        <div className="w-32 h-32 bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden">
                          <img
                            src={tokenData.imageUrl}
                            alt="Token logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.parentElement!.innerHTML = '<div class="text-red-500 text-sm">Failed to load image</div>'
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-lg">{tokenData.name || 'Your Token'}</div>
                          <div className="text-slate-500">${tokenData.symbol || 'SYMBOL'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      <strong>Pro Tips:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                        <li>Use a square image (512x512 or 1024x1024)</li>
                        <li>Keep it simple and recognizable at small sizes</li>
                        <li>Use transparent backgrounds (PNG format recommended)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Step 3: Bonding Curve */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Curve Type</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Linear:</strong> Price increases at constant rate</p>
                          <p><strong>Exponential:</strong> Price accelerates with supply</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <RadioGroup
                      value={tokenData.curveType}
                      onValueChange={(value) => updateTokenData('curveType', value as 'linear' | 'exponential')}
                    >
                      <div className="flex gap-4">
                        <div className={`flex-1 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          tokenData.curveType === 'linear'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                          <RadioGroupItem value="linear" id="linear" className="sr-only" />
                          <Label htmlFor="linear" className="cursor-pointer block">
                            <div className="font-semibold mb-1">Linear</div>
                            <div className="text-sm text-slate-600">Steady, predictable growth</div>
                          </Label>
                        </div>
                        <div className={`flex-1 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          tokenData.curveType === 'exponential'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                          <RadioGroupItem value="exponential" id="exponential" className="sr-only" />
                          <Label htmlFor="exponential" className="cursor-pointer block">
                            <div className="font-semibold mb-1">Exponential</div>
                            <div className="text-sm text-slate-600">Accelerating price increase</div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Base Price (BNB)</Label>
                      <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        {tokenData.basePrice.toFixed(6)}
                      </span>
                    </div>
                    <Slider
                      value={[tokenData.basePrice * 1000000]}
                      onValueChange={([value]) => updateTokenData('basePrice', value / 1000000)}
                      min={100}
                      max={10000}
                      step={100}
                      className="py-4"
                    />
                    <p className="text-xs text-slate-500">Starting price per token</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Slope (Price Growth Rate)</Label>
                      <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        {tokenData.slope.toFixed(6)}
                      </span>
                    </div>
                    <Slider
                      value={[tokenData.slope * 10000000]}
                      onValueChange={([value]) => updateTokenData('slope', value / 10000000)}
                      min={100}
                      max={10000}
                      step={100}
                      className="py-4"
                    />
                    <p className="text-xs text-slate-500">How quickly price increases with supply</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Graduation Threshold (USD)</Label>
                      <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        ${tokenData.graduationThreshold.toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={[tokenData.graduationThreshold]}
                      onValueChange={([value]) => updateTokenData('graduationThreshold', value)}
                      min={10000}
                      max={500000}
                      step={10000}
                      className="py-4"
                    />
                    <p className="text-xs text-slate-500">Market cap needed to graduate to DEX</p>
                  </div>

                  <Separator />

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Price Curve Preview
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={curveData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="supply"
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(value) => `$${value.toFixed(4)}`}
                          />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            labelFormatter={(value) => `Supply: ${Number(value).toLocaleString()}`}
                            formatter={(value: any) => [`$${Number(value).toFixed(6)}`, 'Price']}
                          />
                          <ReferenceLine
                            y={tokenData.graduationThreshold / (tokenData.maxSupply / 2)}
                            stroke="#10b981"
                            strokeDasharray="3 3"
                            label={{ value: 'Graduation', position: 'right', fill: '#10b981', fontSize: 12 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Supply Settings */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Initial Supply</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tokens available at launch</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        {tokenData.initialSupply.toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={[tokenData.initialSupply]}
                      onValueChange={([value]) => updateTokenData('initialSupply', value)}
                      min={100000}
                      max={tokenData.maxSupply}
                      step={100000}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Maximum Supply</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total tokens that will ever exist</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        {tokenData.maxSupply.toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={[tokenData.maxSupply]}
                      onValueChange={([value]) => {
                        updateTokenData('maxSupply', value)
                        if (tokenData.initialSupply > value) {
                          updateTokenData('initialSupply', value)
                        }
                      }}
                      min={1000000}
                      max={100000000}
                      step={1000000}
                      className="py-4"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium mb-1">Initial Market Cap</div>
                      <div className="text-2xl font-bold text-blue-900">
                        ${(tokenData.initialSupply * tokenData.basePrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium mb-1">Max Market Cap</div>
                      <div className="text-2xl font-bold text-green-900">
                        ${(tokenData.maxSupply * (tokenData.curveType === 'linear'
                          ? tokenData.basePrice + tokenData.slope * tokenData.maxSupply
                          : tokenData.basePrice * Math.pow(1 + tokenData.slope * 100, tokenData.maxSupply / 100000)
                        )).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 text-sm">
                      <strong>Important:</strong> Initial supply will be minted to the bonding curve contract.
                      Remaining supply mints as tokens are purchased.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Step 5: Review & Launch */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Launch Summary
                    </h3>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-600 mb-2">Token Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Name:</span>
                            <span className="font-medium">{tokenData.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Symbol:</span>
                            <span className="font-medium">{tokenData.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Curve Type:</span>
                            <span className="font-medium capitalize">{tokenData.curveType}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-slate-600 mb-2">Economics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Base Price:</span>
                            <span className="font-medium">{tokenData.basePrice.toFixed(6)} BNB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Initial Supply:</span>
                            <span className="font-medium">{tokenData.initialSupply.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Max Supply:</span>
                            <span className="font-medium">{tokenData.maxSupply.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Estimated Costs
                    </h4>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Contract Deployment:</span>
                        <span className="font-medium">{estimatedCosts.deployment} BNB (~${(estimatedCosts.deployment * 400).toFixed(2)})</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Initial Liquidity:</span>
                        <span className="font-medium">${estimatedCosts.initialLiquidity.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Platform Fee (2%):</span>
                        <span className="font-medium">${estimatedCosts.platformFee.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Estimated Cost:</span>
                        <span className="text-blue-600">${estimatedCosts.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Pre-Launch Checklist
                    </h4>

                    <div className="space-y-2">
                      {[
                        { label: 'Token details configured', checked: tokenData.name && tokenData.symbol },
                        { label: 'Branding image uploaded', checked: tokenData.imageUrl },
                        { label: 'Bonding curve parameters set', checked: tokenData.basePrice > 0 },
                        { label: 'Supply allocation configured', checked: tokenData.initialSupply > 0 },
                        { label: 'Sufficient BNB for deployment', checked: false },
                        { label: 'Community announcements ready', checked: false },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            item.checked ? 'bg-green-500' : 'bg-slate-200'
                          }`}>
                            {item.checked && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <span className={item.checked ? 'text-slate-900' : 'text-slate-500'}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert className="bg-green-50 border-green-200">
                    <Rocket className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      <strong>Ready to Launch!</strong> Review all details carefully before deploying to mainnet.
                      Consider testing on testnet first.
                    </AlertDescription>
                  </Alert>

                  <Button className="w-full h-12 text-lg" size="lg">
                    <Rocket className="w-5 h-5 mr-2" />
                    Deploy Token to KasPump
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="min-w-[120px]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={nextStep}
                disabled={!isStepValid}
                className="min-w-[120px]"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(1)}
                className="min-w-[120px]"
              >
                Start Over
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>🚀 Powered by KasPump · Launch tokens with confidence</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
