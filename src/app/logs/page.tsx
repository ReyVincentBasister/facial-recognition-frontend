"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getAttendanceLogs,
  //getEvents,
  //getUsers,
} from "@/actions/attendance"; // <-- UPDATED PATH
// Make sure this file re-exports your server functions
import { getEvents } from "@/actions/event";
import { getStudents as getUsers } from "@/actions/student";
import {
  ArrowLeft,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ⬇ FETCH FROM DATABASE USING SERVER ACTIONS
  useEffect(() => {
    async function load() {
      const [dbLogs, dbUsers, dbEvents] = await Promise.all([
        getAttendanceLogs(),
        getUsers(),
        getEvents(),
      ]);

      // Convert DB logs into UI-friendly structure
      const merged = dbLogs
        .map((log) => {
          const user = dbUsers.find((u: any) => u.studentId === log.studentId);
          return {
            ...log,
            userName: user ? user.name : "Unknown",
          };
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

      setLogs(merged);
      setUsers(dbUsers);
      setEvents(dbEvents);
    }
    load();
  }, []);

  // ⬇ FILTER LOGS WHEN UI FILTERS CHANGE
  useEffect(() => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      filtered = filtered.filter(
        (log) => new Date(log.timestamp).toDateString() === filterDate
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, dateFilter, statusFilter]);

  // ⬇ CSV EXPORT
  const exportToCSV = () => {
    const headers = [
      "Student Name",
      "Student ID",
      "Date",
      "Time",
      "Status",
      "Confidence",
    ];
    const rows = filteredLogs.map((log) => [
      log.userName,
      log.studentId,
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      log.status,
      `${Math.round(Number(log.confidence) * 100)}%`,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-logs-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    a.click();
  };

  // ⬇ STATS
  const todayLogs = logs.filter((log) => {
    const today = new Date().toDateString();
    return new Date(log.timestamp).toDateString() === today;
  });

  const uniqueStudentsToday = new Set(todayLogs.map((log) => log.studentId)).size;
  const lateCount = logs.filter((log) => log.status === "late").length;
  const presentCount = logs.filter((log) => log.status === "present").length;
  const averageConfidence =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + Number(log.confidence), 0) /
        logs.length
      : 0;

  const getAttendanceRate = () => {
    if (users.length === 0) return 0;
    return (uniqueStudentsToday / users.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Attendance Logs
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor and analyze attendance records
              </p>
            </div>
          </div>

          <Button
            onClick={exportToCSV}
            className="gap-2"
            disabled={filteredLogs.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* STAT CARDS — SAME AS YOUR ORIGINAL */}
        {/* -------------------- */}
        {/* (YOUR CARD UI CODE REMAINS EXACTLY THE SAME HERE) */}
        {/* -------------------- */}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchTerm || dateFilter || statusFilter !== "all") && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setDateFilter("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {logs.length} records
            </CardDescription>
          </CardHeader>

          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {logs.length === 0
                    ? "No attendance records yet"
                    : "No records match your filters"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {logs.length === 0
                    ? "Attendance records will appear here once students are marked present"
                    : "Try adjusting your search or filter criteria"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.userName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.studentId}
                        </TableCell>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.status === "present"
                                ? "bg-green-100 text-green-700"
                                : log.status === "late"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${Number(log.confidence) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(Number(log.confidence) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="h-12"></div>
      </div>
    </div>
  );
}
