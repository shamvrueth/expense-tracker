'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chart, ChartTooltip } from "@/components/ui/chart"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

const COLORS = ["#9333ea", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff", "#f3e8ff"]

export function ExpenseChart() {
  const [monthlyData, setMonthlyData] = useState<{ name: string; expenses: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ✅ Safe localStorage wrapper
  const getFromLocalStorage = (key: string) => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(key)
  }

  const getAuthHeaders = () => {
    const token = getFromLocalStorage('token')
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  }

  const fetchMonthlyExpenses = async () => {
    console.log("📦 fetchMonthlyExpenses called");
    const user_id = localStorage.getItem('user_id');
    console.log("🧩 user_id in fetchMonthlyExpenses:", user_id);
    if (!user_id) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/expense/monthly/${user_id}`, {
        headers: getAuthHeaders(),
      });
      console.log("📡 Monthly expenses response status:", response.status);

      if (!response.ok) throw new Error('Failed to fetch monthly expenses');

      const data = await response.json();
      console.log("✅ Monthly expenses raw data:", data);

      // ✅ Transform to match chart format
      const transformed = data.map((item: any) => ({
        name: new Date(item.month).toLocaleString('default', { month: 'short', year: 'numeric' }),
        expenses: parseFloat(item.total_expenses),
      }));

      console.log("🎨 Transformed monthly chart data:", transformed);
      setMonthlyData(transformed);
    } catch (error) {
      console.error('❌ Error fetching monthly expenses:', error);
    }
  };


  const fetchCategoryExpenses = async () => {
    console.log("📦 fetchCategoryExpenses called")
    const user_id = getFromLocalStorage('user_id')

    if (!user_id) {
      console.warn("⚠️ No user_id found in localStorage (category)")
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/expense/categories/${user_id}`, {
        headers: getAuthHeaders()
      })
      console.log("📡 Category expenses response status:", response.status)

      if (!response.ok) throw new Error('Failed to fetch category expenses')
      
      const data = await response.json()
      console.log("✅ Category data:", data)
      setCategoryData(
        data.map((item: any) => ({
          name: item.name,
          value: Number(item.value)
        }))
      )
    } catch (error) {
      console.error('❌ Error fetching category expenses:', error)
    }
  }

  console.log("✅ Component rendered - before useEffect")

  useEffect(() => {
    console.log("🔥 useEffect triggered - starting fetchData()")

    const fetchData = async () => {
      console.log("🚀 Inside fetchData()")
      setIsLoading(true)
      try {
        await fetchMonthlyExpenses()
        await fetchCategoryExpenses()
      } finally {
        setIsLoading(false)
      }
    }

    // ✅ Wrap in requestIdleCallback to avoid hydration issues
    if (typeof window !== "undefined") {
      window.requestIdleCallback(fetchData)
    } else {
      fetchData()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        
        <Card className="border-purple-900/20 card-hover">
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
            <CardDescription>Your expense trend over the past year</CardDescription>
          </CardHeader>
          <CardContent><div>Loading...</div></CardContent>
        </Card>

        <Card className="border-purple-900/20 card-hover">
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Breakdown of your expenses by category</CardDescription>
          </CardHeader>
          <CardContent><div>Loading...</div></CardContent>
        </Card>
      </div>
    )
  }
  console.log("✅ Final categoryData passed to PieChart:", categoryData);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Monthly Expenses Chart */}
      <Card className="border-purple-900/20 card-hover">
        <CardHeader>
          <CardTitle>Monthly Expenses</CardTitle>
          <CardDescription>Your expense trend over the past year</CardDescription>
        </CardHeader>
        <CardContent>
          <Chart>
            <Chart.Content>
              <Chart.ResponsiveContainer width="100%" height={300}>
                <Chart.ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <Chart.CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Chart.XAxis dataKey="name" tick={{ fill: "#a1a1aa" }} />
                  <Chart.YAxis tick={{ fill: "#a1a1aa" }} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip />
                  <Chart.Area type="monotone" dataKey="expenses" fill="url(#colorExpenses)" stroke="#9333ea" strokeWidth={2} />
                  <defs>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                </Chart.ComposedChart>
              </Chart.ResponsiveContainer>
            </Chart.Content>
          </Chart>
        </CardContent>
      </Card>

      {/* Category Chart */}
      

      <Card className="border-purple-900/20 card-hover">
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
          <CardDescription>Breakdown of your expenses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value}`} />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
