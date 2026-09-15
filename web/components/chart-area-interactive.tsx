"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", locks: 222, claims: 150 },
  { date: "2024-04-02", locks: 97, claims: 180 },
  { date: "2024-04-03", locks: 167, claims: 120 },
  { date: "2024-04-04", locks: 242, claims: 260 },
  { date: "2024-04-05", locks: 373, claims: 290 },
  { date: "2024-04-06", locks: 301, claims: 340 },
  { date: "2024-04-07", locks: 245, claims: 180 },
  { date: "2024-04-08", locks: 409, claims: 320 },
  { date: "2024-04-09", locks: 59, claims: 110 },
  { date: "2024-04-10", locks: 261, claims: 190 },
  { date: "2024-04-11", locks: 327, claims: 350 },
  { date: "2024-04-12", locks: 292, claims: 210 },
  { date: "2024-04-13", locks: 342, claims: 380 },
  { date: "2024-04-14", locks: 137, claims: 220 },
  { date: "2024-04-15", locks: 120, claims: 170 },
  { date: "2024-04-16", locks: 138, claims: 190 },
  { date: "2024-04-17", locks: 446, claims: 360 },
  { date: "2024-04-18", locks: 364, claims: 410 },
  { date: "2024-04-19", locks: 243, claims: 180 },
  { date: "2024-04-20", locks: 89, claims: 150 },
  { date: "2024-04-21", locks: 137, claims: 200 },
  { date: "2024-04-22", locks: 224, claims: 170 },
  { date: "2024-04-23", locks: 138, claims: 230 },
  { date: "2024-04-24", locks: 387, claims: 290 },
  { date: "2024-04-25", locks: 215, claims: 250 },
  { date: "2024-04-26", locks: 75, claims: 130 },
  { date: "2024-04-27", locks: 383, claims: 420 },
  { date: "2024-04-28", locks: 122, claims: 180 },
  { date: "2024-04-29", locks: 315, claims: 240 },
  { date: "2024-04-30", locks: 454, claims: 380 },
  { date: "2024-05-01", locks: 165, claims: 220 },
  { date: "2024-05-02", locks: 293, claims: 310 },
  { date: "2024-05-03", locks: 247, claims: 190 },
  { date: "2024-05-04", locks: 385, claims: 420 },
  { date: "2024-05-05", locks: 481, claims: 390 },
  { date: "2024-05-06", locks: 498, claims: 520 },
  { date: "2024-05-07", locks: 388, claims: 300 },
  { date: "2024-05-08", locks: 149, claims: 210 },
  { date: "2024-05-09", locks: 227, claims: 180 },
  { date: "2024-05-10", locks: 293, claims: 330 },
  { date: "2024-05-11", locks: 335, claims: 270 },
  { date: "2024-05-12", locks: 197, claims: 240 },
  { date: "2024-05-13", locks: 197, claims: 160 },
  { date: "2024-05-14", locks: 448, claims: 490 },
  { date: "2024-05-15", locks: 473, claims: 380 },
  { date: "2024-05-16", locks: 338, claims: 400 },
  { date: "2024-05-17", locks: 499, claims: 420 },
  { date: "2024-05-18", locks: 315, claims: 350 },
  { date: "2024-05-19", locks: 235, claims: 180 },
  { date: "2024-05-20", locks: 177, claims: 230 },
  { date: "2024-05-21", locks: 82, claims: 140 },
  { date: "2024-05-22", locks: 81, claims: 120 },
  { date: "2024-05-23", locks: 252, claims: 290 },
  { date: "2024-05-24", locks: 294, claims: 220 },
  { date: "2024-05-25", locks: 201, claims: 250 },
  { date: "2024-05-26", locks: 213, claims: 170 },
  { date: "2024-05-27", locks: 420, claims: 460 },
  { date: "2024-05-28", locks: 233, claims: 190 },
  { date: "2024-05-29", locks: 78, claims: 130 },
  { date: "2024-05-30", locks: 340, claims: 280 },
  { date: "2024-05-31", locks: 178, claims: 230 },
  { date: "2024-06-01", locks: 178, claims: 200 },
  { date: "2024-06-02", locks: 470, claims: 410 },
  { date: "2024-06-03", locks: 103, claims: 160 },
  { date: "2024-06-04", locks: 439, claims: 380 },
  { date: "2024-06-05", locks: 88, claims: 140 },
  { date: "2024-06-06", locks: 294, claims: 250 },
  { date: "2024-06-07", locks: 323, claims: 370 },
  { date: "2024-06-08", locks: 385, claims: 320 },
  { date: "2024-06-09", locks: 438, claims: 480 },
  { date: "2024-06-10", locks: 155, claims: 200 },
  { date: "2024-06-11", locks: 92, claims: 150 },
  { date: "2024-06-12", locks: 492, claims: 420 },
  { date: "2024-06-13", locks: 81, claims: 130 },
  { date: "2024-06-14", locks: 426, claims: 380 },
  { date: "2024-06-15", locks: 307, claims: 350 },
  { date: "2024-06-16", locks: 371, claims: 310 },
  { date: "2024-06-17", locks: 475, claims: 520 },
  { date: "2024-06-18", locks: 107, claims: 170 },
  { date: "2024-06-19", locks: 341, claims: 290 },
  { date: "2024-06-20", locks: 408, claims: 450 },
  { date: "2024-06-21", locks: 169, claims: 210 },
  { date: "2024-06-22", locks: 317, claims: 270 },
  { date: "2024-06-23", locks: 480, claims: 530 },
  { date: "2024-06-24", locks: 132, claims: 180 },
  { date: "2024-06-25", locks: 141, claims: 190 },
  { date: "2024-06-26", locks: 434, claims: 380 },
  { date: "2024-06-27", locks: 448, claims: 490 },
  { date: "2024-06-28", locks: 149, claims: 200 },
  { date: "2024-06-29", locks: 103, claims: 160 },
  { date: "2024-06-30", locks: 446, claims: 400 },
]

const chartConfig = {
  activity: {
    label: "Activity",
  },
  locks: {
    label: "Locks created",
    color: "#0050e0",
  },
  claims: {
    label: "Claims",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card shadow-none ring-0">
      <CardHeader>
        <CardTitle>Lock activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Locks created vs claims — sample window
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillLocks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0050e0" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#0050e0" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillClaims" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="claims"
              type="natural"
              fill="url(#fillClaims)"
              stroke="#6b7280"
              strokeWidth={1.5}
              stackId="a"
            />
            <Area
              dataKey="locks"
              type="natural"
              fill="url(#fillLocks)"
              stroke="#0050e0"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
