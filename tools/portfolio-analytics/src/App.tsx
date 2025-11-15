import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'

interface TokenHolding {
  symbol: string
  name: string
  amount: number
  avgBuyPrice: number
  currentPrice: number
  totalInvested: number
  currentValue: number
  pnl: number
  pnlPercentage: number
  allocation: number
}

interface HistoricalDataPoint {
  date: string
  value: number
}

// Mock data generator
const generateMockData = () => {
  const holdings: TokenHolding[] = [
    {
      symbol: 'PUMP',
      name: 'PumpCoin',
      amount: 50000,
      avgBuyPrice: 0.0012,
      currentPrice: 0.0018,
      totalInvested: 60,
      currentValue: 90,
      pnl: 30,
      pnlPercentage: 50,
      allocation: 35,
    },
    {
      symbol: 'MOON',
      name: 'MoonToken',
      amount: 25000,
      avgBuyPrice: 0.0025,
      currentPrice: 0.0022,
      totalInvested: 62.5,
      currentValue: 55,
      pnl: -7.5,
      pnlPercentage: -12,
      allocation: 21.5,
    },
    {
      symbol: 'DOGE',
      name: 'DogeRocket',
      amount: 100000,
      avgBuyPrice: 0.0008,
      currentPrice: 0.00095,
      totalInvested: 80,
      currentValue: 95,
      pnl: 15,
      pnlPercentage: 18.75,
      allocation: 37,
    },
    {
      symbol: 'SHIB',
      name: 'ShibaPump',
      amount: 15000,
      avgBuyPrice: 0.0011,
      currentPrice: 0.0011,
      totalInvested: 16.5,
      currentValue: 16.5,
      pnl: 0,
      pnlPercentage: 0,
      allocation: 6.5,
    },
  ]

  const days = 30
  const historicalData: HistoricalDataPoint[] = []
  let value = 200

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    value = value + (Math.random() - 0.45) * 10
    historicalData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Number(value.toFixed(2)),
    })
  }

  return { holdings, historicalData }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function App() {
  const [timePeriod, setTimePeriod] = useState('30d')
  const { holdings, historicalData } = useMemo(() => generateMockData(), [])

  const totalValue = useMemo(() => holdings.reduce((sum, h) => sum + h.currentValue, 0), [holdings])
  const totalInvested = useMemo(() => holdings.reduce((sum, h) => sum + h.totalInvested, 0), [holdings])
  const totalPnL = useMemo(() => totalValue - totalInvested, [totalValue, totalInvested])
  const totalPnLPercentage = useMemo(() => ((totalPnL / totalInvested) * 100).toFixed(2), [totalPnL, totalInvested])

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.currentValue - a.currentValue)
  }, [holdings])

  const pieData = useMemo(() => {
    return sortedHoldings.map((h) => ({
      name: h.symbol,
      value: h.currentValue,
    }))
  }, [sortedHoldings])

  const initialValue = historicalData[0]?.value || 200
  const currentValue = historicalData[historicalData.length - 1]?.value || 256
  const periodChange = currentValue - initialValue
  const periodChangePercentage = ((periodChange / initialValue) * 100).toFixed(2)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Portfolio Analytics</h1>
          </div>
          <p className="text-slate-400">Track your KasPump token investments and performance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Total Portfolio Value</CardDescription>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                {totalValue.toFixed(2)} BNB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                ≈ ${(totalValue * 400).toFixed(2)} USD
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Total Invested</CardDescription>
              <CardTitle className="text-2xl text-white">
                {totalInvested.toFixed(2)} BNB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                Initial capital
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-slate-800/50 border-slate-700 backdrop-blur ${totalPnL >= 0 ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Total P&L</CardDescription>
              <CardTitle className={`text-2xl flex items-center gap-2 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} BNB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnLPercentage}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-400">Holdings</CardDescription>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-400" />
                {holdings.length} Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                Active positions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Performance Chart */}
          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Portfolio Performance
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    Portfolio value over time
                  </CardDescription>
                </div>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger className="w-[120px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="text-3xl font-bold text-white mb-1">
                  {currentValue.toFixed(2)} BNB
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${Number(periodChangePercentage) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(periodChangePercentage) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Number(periodChangePercentage) >= 0 ? '+' : ''}{periodChangePercentage}% ({Number(periodChangePercentage) >= 0 ? '+' : ''}{periodChange.toFixed(2)} BNB)
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `${value.toFixed(0)}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)} BNB`, 'Value']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Allocation Pie Chart */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-400" />
                Allocation
              </CardTitle>
              <CardDescription className="text-slate-400">
                Portfolio distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)} BNB`, 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {sortedHoldings.slice(0, 4).map((holding, index) => (
                  <div key={holding.symbol} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-300">{holding.symbol}</span>
                    </div>
                    <span className="text-slate-400">{holding.allocation.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Holdings</CardTitle>
            <CardDescription className="text-slate-400">
              Your token positions and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedHoldings.map((holding) => (
                <div
                  key={holding.symbol}
                  className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* Token Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {holding.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{holding.name}</div>
                          <div className="text-sm text-slate-400">{holding.symbol}</div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Amount</div>
                      <div className="font-medium text-white">{holding.amount.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">
                        Avg: {holding.avgBuyPrice.toFixed(6)}
                      </div>
                    </div>

                    {/* Current Value */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Current Value</div>
                      <div className="font-medium text-white">{holding.currentValue.toFixed(2)} BNB</div>
                      <div className="text-xs text-slate-500">
                        @ {holding.currentPrice.toFixed(6)}
                      </div>
                    </div>

                    {/* Investment */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Invested</div>
                      <div className="font-medium text-white">{holding.totalInvested.toFixed(2)} BNB</div>
                    </div>

                    {/* P&L */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">P&L</div>
                      <div className={`font-semibold ${holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {holding.pnl >= 0 ? '+' : ''}{holding.pnl.toFixed(2)} BNB
                      </div>
                      <div className={`text-sm font-medium ${holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {holding.pnl >= 0 ? '+' : ''}{holding.pnlPercentage.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>📊 Real-time portfolio tracking powered by KasPump</p>
        </div>
      </div>
    </div>
  )
}

export default App
