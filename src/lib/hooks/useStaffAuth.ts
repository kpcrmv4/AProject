"use client";

import { useState, useEffect, useCallback } from "react";
import type { Checkpoint } from "@/types/database";

const STORAGE_KEY = "erm_staff_session";

interface StaffSession {
  checkpoint: Checkpoint;
  authenticatedAt: string;
}

interface UseStaffAuthReturn {
  checkpoint: Checkpoint | null;
  isAuthenticated: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

export function useStaffAuth(): UseStaffAuthReturn {
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session: StaffSession = JSON.parse(stored);
        // Check if the stored code hasn't expired
        const expiresAt = new Date(session.checkpoint.code_expires_at);
        if (expiresAt > new Date()) {
          setCheckpoint(session.checkpoint);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      // Validate 4-digit code format
      if (!/^\d{4}$/.test(code)) {
        return { success: false, error: "Code must be exactly 4 digits" };
      }

      setIsLoading(true);

      try {
        const response = await fetch("/api/staff/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          return {
            success: false,
            error: result.error?.message ?? "Authentication failed",
          };
        }

        const checkpointData: Checkpoint = result.data;

        // Persist session
        const session: StaffSession = {
          checkpoint: checkpointData,
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

        setCheckpoint(checkpointData);
        return { success: true };
      } catch {
        return { success: false, error: "Network error. Please try again." };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCheckpoint(null);
  }, []);

  return {
    checkpoint,
    isAuthenticated: checkpoint !== null,
    login,
    logout,
    isLoading,
  };
}
