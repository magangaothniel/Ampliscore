import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGradeColor(grade: number): string {
  if (grade >= 90) return "text-emerald-600";
  if (grade >= 80) return "text-green-600";
  if (grade >= 70) return "text-amber-500";
  if (grade >= 60) return "text-orange-500";
  return "text-red-500";
}

export function getGradeStatus(grade: number): "on-track" | "at-risk" | "failing" {
  if (grade >= 70) return "on-track";
  if (grade >= 60) return "at-risk";
  return "failing";
}

export function getLetterGrade(grade: number): string {
  if (grade >= 93) return "A";
  if (grade >= 90) return "A-";
  if (grade >= 87) return "B+";
  if (grade >= 83) return "B";
  if (grade >= 80) return "B-";
  if (grade >= 77) return "C+";
  if (grade >= 73) return "C";
  if (grade >= 70) return "C-";
  if (grade >= 67) return "D+";
  if (grade >= 63) return "D";
  if (grade >= 60) return "D-";
  return "F";
}

export function getGradePoints(grade: number): number {
  if (grade >= 93) return 4.0;
  if (grade >= 90) return 3.7;
  if (grade >= 87) return 3.3;
  if (grade >= 83) return 3.0;
  if (grade >= 80) return 2.7;
  if (grade >= 77) return 2.3;
  if (grade >= 73) return 2.0;
  if (grade >= 70) return 1.7;
  if (grade >= 67) return 1.3;
  if (grade >= 63) return 1.0;
  if (grade >= 60) return 0.7;
  return 0.0;
}

export function calculateGPA(courses: { grade: number; credits: number }[]): number {
  if (courses.length === 0) return 0;
  const totalPoints = courses.reduce((sum, c) => sum + getGradePoints(c.grade) * c.credits, 0);
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  if (totalCredits === 0) return 0;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

export function predictFinalGrade(
  assignments: { grade: number; weight: number; completed: boolean }[]
): number {
  const completed = assignments.filter((a) => a.completed);
  const remaining = assignments.filter((a) => !a.completed);
  if (completed.length === 0) return 0;
  const completedWeight = completed.reduce((sum, a) => sum + a.weight, 0);
  const completedScore = completed.reduce((sum, a) => sum + (a.grade * a.weight) / 100, 0);
  const remainingWeight = remaining.reduce((sum, a) => sum + a.weight, 0);
  const projectedRemaining = remainingWeight * 0.75;
  const total = completedScore + projectedRemaining * (remainingWeight / 100);
  const totalWeight = completedWeight + remainingWeight;
  return Math.round((total / totalWeight) * 100 * 10) / 10;
}
