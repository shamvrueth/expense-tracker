"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

import {
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export function MonthlyTrendChart() {
  const [monthlyData, setMonthlyData] = useState<{ name: string; amount: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  const fetchMonthlyExpenses = async () => {
    const user_id = localStorage.getItem("user_id")
    if (!user_id) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/expense/monthly/${user_id}`,
        { headers: getAuthHeaders() }
      )

      if (!response.ok) throw new Error("Failed to fetch monthly expenses")

      const data = await response.json()

      // ✅ Ensure numbers and correct keys
      const formattedData = data.map((item: { name: string; expenses: number | string }) => ({
        name: item.name,
        amount: Number(item.expenses)
      }))

      console.log("📊 Monthly Data for Chart:", formattedData)
      setMonthlyData(formattedData)
    } catch (error) {
      console.error("Error fetching monthly expenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthlyExpenses()
  }, [])

  if (isLoading) {
    return (
      <Card className="border-purple-900/20 card-hover">
        {/* <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>Your expense trend over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div>Loading...</div>
        </CardContent> */}
      </Card>
    )
  }

  if (!monthlyData.length) {
    return (
      <Card className="border-purple-900/20 card-hover">
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>No data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-zinc-500 text-sm">Add expenses to see your monthly trend.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-900/20 card-hover">
      {/* <CardHeader>
        <CardTitle>Monthly Trend</CardTitle>
        <CardDescription>Your expense trend over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={monthlyData}
            margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#a1a1aa" }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={{ stroke: "#27272a" }}
            />
            <YAxis
              tick={{ fill: "#a1a1aa" }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={{ stroke: "#27272a" }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1e1e",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value: number) => [`₹${value}`, "Expenses"]}
            />
            <Bar
              dataKey="amount"
              fill="#9333ea"
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#c084fc"
              strokeWidth={2}
              dot={{ r: 4, fill: "#c084fc" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent> */}
    </Card>
  )
}
