import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, DollarSign, Zap, AlertCircle, Target } from 'lucide-react'

function App() {
  // State for bonding curve parameters
  const [basePrice, setBasePrice] = useState(0.0001) // Starting price in BNB
  const [slope, setSlope] = useState(0.00001) // Price increase per token
  const [curveType, setCurveType] = useState<'linear' | 'exponential'>('linear')
  const [totalSupply, setTotalSupply] = useState(1000000) // Total token supply
  const [currentSupply, setCurrentSupply] = useState(500000) // Current circulating supply
  const [tradeAmount, setTradeAmount] = useState(1000) // Amount for price impact calc
  const [graduationThreshold, setGraduationThreshold] = useState(80) // % to graduate to AMM

  // Calculate bonding curve data
  const chartData = useMemo(() => {
    const points = 100
    const data = []
    const step = totalSupply / points

    for (let i = 0; i <= points; i++) {
      const supply = i * step
      let price

      if (curveType === 'linear') {
        price = basePrice + (slope * supply)
      } else {
        // Exponential: price = basePrice * (1 + slope)^(supply / 1000)
        price = basePrice * Math.pow(1 + slope * 100, supply / 1000)
      }

      data.push({
        supply: Math.round(supply),
        price: price,
        marketCap: supply * price
      })
    }

    return data
  }, [basePrice, slope, curveType, totalSupply])

  // Calculate current metrics
  const currentMetrics = useMemo(() => {
    let currentPrice
    if (curveType === 'linear') {
      currentPrice = basePrice + (slope * currentSupply)
    } else {
      currentPrice = basePrice * Math.pow(1 + slope * 100, currentSupply / 1000)
    }

    const marketCap = currentSupply * currentPrice
    const progress = (currentSupply / totalSupply) * 100

    // Calculate price after buying tradeAmount tokens
    let priceAfterBuy
    const newSupply = currentSupply + tradeAmount
    if (curveType === 'linear') {
      priceAfterBuy = basePrice + (slope * newSupply)
    } else {
      priceAfterBuy = basePrice * Math.pow(1 + slope * 100, newSupply / 1000)
    }

    const priceImpact = ((priceAfterBuy - currentPrice) / currentPrice) * 100

    // Average buy price for the trade
    const avgBuyPrice = (currentPrice + priceAfterBuy) / 2
    const tradeCost = avgBuyPrice * tradeAmount

    return {
      currentPrice,
      marketCap,
      progress,
      priceImpact,
      avgBuyPrice,
      tradeCost,
      isGraduated: progress >= graduationThreshold
    }
  }, [basePrice, slope, curveType, totalSupply, currentSupply, tradeAmount, graduationThreshold])

  const formatNumber = (num: number, decimals = 6) => {
    if (num === 0) return '0'
    if (num < 0.000001) return num.toExponential(2)
    if (num < 1) return num.toFixed(decimals)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K'
    return (num / 1000000).toFixed(2) + 'M'
  }

  const graduationSupply = (totalSupply * graduationThreshold) / 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-2">
            <TrendingUp className="text-emerald-400" />
            Bonding Curve Simulator
          </h1>
          <p className="text-slate-400 text-lg">
            Visualize and understand token bonding curve economics in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="text-yellow-400" size={20} />
                Price Curve Visualization
              </CardTitle>
              <CardDescription className="text-slate-400">
                {curveType === 'linear' ? 'Linear growth' : 'Exponential growth'} bonding curve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="supply"
                    stroke="#94a3b8"
                    label={{ value: 'Token Supply', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                    tickFormatter={(value) => formatNumber(value, 0)}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: 'Price (BNB)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: any) => formatNumber(value)}
                  />
                  <ReferenceLine
                    x={currentSupply}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    label={{ value: 'Current Supply', fill: '#3b82f6', position: 'top' }}
                  />
                  <ReferenceLine
                    x={graduationSupply}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{ value: 'Graduation', fill: '#f59e0b', position: 'top' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Progress Bar */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Bonding Curve Progress</span>
                  <span className="text-white font-semibold">{currentMetrics.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-yellow-500 transition-all duration-300"
                    style={{ width: `${Math.min(currentMetrics.progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0 tokens</span>
                  <span className="text-yellow-400">{graduationThreshold}% → AMM</span>
                  <span>{formatNumber(totalSupply, 0)} tokens</span>
                </div>
              </div>

              {currentMetrics.isGraduated && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                  <Target className="text-yellow-400" size={20} />
                  <div>
                    <div className="text-yellow-400 font-semibold">Graduated to AMM!</div>
                    <div className="text-sm text-yellow-300/70">Token has reached the graduation threshold and would move to a decentralized AMM</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics Panel */}
          <div className="space-y-6">
            {/* Current Metrics */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Current Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Current Price</span>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {formatNumber(currentMetrics.currentPrice)} BNB
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Market Cap</span>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {formatNumber(currentMetrics.marketCap)} BNB
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Circulating Supply</span>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {formatNumber(currentSupply, 0)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade Impact */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <DollarSign size={18} className="text-green-400" />
                  Trade Impact
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Buying {formatNumber(tradeAmount, 0)} tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Average Price</span>
                    <span className="text-white font-mono">{formatNumber(currentMetrics.avgBuyPrice)} BNB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Total Cost</span>
                    <span className="text-white font-mono">{formatNumber(currentMetrics.tradeCost)} BNB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Price Impact</span>
                    <Badge
                      variant="secondary"
                      className={
                        currentMetrics.priceImpact > 10
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : currentMetrics.priceImpact > 5
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-green-500/20 text-green-400 border-green-500/30"
                      }
                    >
                      +{currentMetrics.priceImpact.toFixed(2)}%
                    </Badge>
                  </div>
                </div>

                {currentMetrics.priceImpact > 10 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-400 mt-0.5" size={16} />
                    <div className="text-xs text-red-300">
                      High price impact! Consider splitting into smaller trades.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Curve Parameters</CardTitle>
            <CardDescription className="text-slate-400">
              Adjust parameters to see how they affect the bonding curve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={curveType} onValueChange={(v) => setCurveType(v as 'linear' | 'exponential')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="linear">Linear Curve</TabsTrigger>
                <TabsTrigger value="exponential">Exponential Curve</TabsTrigger>
              </TabsList>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base Price */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="basePrice" className="text-slate-300">Initial Price</Label>
                    <span className="text-sm text-slate-400">{formatNumber(basePrice)} BNB</span>
                  </div>
                  <Slider
                    id="basePrice"
                    min={0.00001}
                    max={0.001}
                    step={0.00001}
                    value={[basePrice]}
                    onValueChange={([v]) => setBasePrice(v)}
                    className="[&_[role=slider]]:bg-emerald-500"
                  />
                </div>

                {/* Slope */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="slope" className="text-slate-300">
                      {curveType === 'linear' ? 'Growth Rate' : 'Exponent'}
                    </Label>
                    <span className="text-sm text-slate-400">{formatNumber(slope)}</span>
                  </div>
                  <Slider
                    id="slope"
                    min={0.000001}
                    max={0.0001}
                    step={0.000001}
                    value={[slope]}
                    onValueChange={([v]) => setSlope(v)}
                    className="[&_[role=slider]]:bg-blue-500"
                  />
                </div>

                {/* Total Supply */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="totalSupply" className="text-slate-300">Total Supply</Label>
                    <span className="text-sm text-slate-400">{formatNumber(totalSupply, 0)}</span>
                  </div>
                  <Slider
                    id="totalSupply"
                    min={100000}
                    max={10000000}
                    step={100000}
                    value={[totalSupply]}
                    onValueChange={([v]) => {
                      setTotalSupply(v)
                      if (currentSupply > v) setCurrentSupply(v / 2)
                    }}
                    className="[&_[role=slider]]:bg-purple-500"
                  />
                </div>

                {/* Current Supply */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="currentSupply" className="text-slate-300">Current Supply</Label>
                    <span className="text-sm text-slate-400">{formatNumber(currentSupply, 0)}</span>
                  </div>
                  <Slider
                    id="currentSupply"
                    min={0}
                    max={totalSupply}
                    step={1000}
                    value={[currentSupply]}
                    onValueChange={([v]) => setCurrentSupply(v)}
                    className="[&_[role=slider]]:bg-blue-400"
                  />
                </div>

                {/* Trade Amount */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="tradeAmount" className="text-slate-300">Trade Amount</Label>
                    <span className="text-sm text-slate-400">{formatNumber(tradeAmount, 0)} tokens</span>
                  </div>
                  <Slider
                    id="tradeAmount"
                    min={100}
                    max={totalSupply / 10}
                    step={100}
                    value={[tradeAmount]}
                    onValueChange={([v]) => setTradeAmount(v)}
                    className="[&_[role=slider]]:bg-green-500"
                  />
                </div>

                {/* Graduation Threshold */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="graduation" className="text-slate-300">Graduation Threshold</Label>
                    <span className="text-sm text-slate-400">{graduationThreshold}%</span>
                  </div>
                  <Slider
                    id="graduation"
                    min={50}
                    max={100}
                    step={5}
                    value={[graduationThreshold]}
                    onValueChange={([v]) => setGraduationThreshold(v)}
                    className="[&_[role=slider]]:bg-yellow-500"
                  />
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Footer */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-300 space-y-2">
              <p className="font-semibold">💡 How Bonding Curves Work:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-200/80">
                <li><strong>Linear:</strong> Price increases at a constant rate (price = base + slope × supply)</li>
                <li><strong>Exponential:</strong> Price grows exponentially (price = base × (1 + slope)^supply)</li>
                <li><strong>Graduation:</strong> When the threshold is reached, liquidity moves to an AMM (like Uniswap)</li>
                <li><strong>Price Impact:</strong> Larger trades cause bigger price movements - plan accordingly!</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
