// Bulk Generate Coding Challenges API
// Uses static pre-made challenges to avoid rate limits and JSON parsing issues

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Pre-made challenges library - no AI needed
const CHALLENGE_LIBRARY = [
    {
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Example: nums = [2,7,11,15], target = 9, Output: [0,1]",
        difficulty: "easy",
        category: "Arrays",
        starter_code: {
            javascript: "function twoSum(nums, target) {\n  // Your code here\n}",
            python: "def two_sum(nums, target):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[2,7,11,15], 9", expected: "[0,1]" },
            { input: "[3,2,4], 6", expected: "[1,2]" }
        ]
    },
    {
        title: "Reverse String",
        description: "Write a function that reverses a string. Example: 'hello' becomes 'olleh'",
        difficulty: "easy",
        category: "Strings",
        starter_code: {
            javascript: "function reverseString(s) {\n  // Your code here\n}",
            python: "def reverse_string(s):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "hello", expected: "olleh" },
            { input: "world", expected: "dlrow" }
        ]
    },
    {
        title: "Find Maximum",
        description: "Find the maximum element in an array of integers. Example: [1,5,3,9,2] returns 9",
        difficulty: "easy",
        category: "Arrays",
        starter_code: {
            javascript: "function findMax(arr) {\n  // Your code here\n}",
            python: "def find_max(arr):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,5,3,9,2]", expected: "9" },
            { input: "[-1,-5,-3]", expected: "-1" }
        ]
    },
    {
        title: "Palindrome Check",
        description: "Check if a given string is a palindrome. A palindrome reads the same forwards and backwards. Example: 'racecar' is a palindrome",
        difficulty: "easy",
        category: "Strings",
        starter_code: {
            javascript: "function isPalindrome(s) {\n  // Your code here\n}",
            python: "def is_palindrome(s):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "racecar", expected: "true" },
            { input: "hello", expected: "false" }
        ]
    },
    {
        title: "Count Vowels",
        description: "Count the number of vowels (a,e,i,o,u) in a string. Example: 'hello world' has 3 vowels",
        difficulty: "easy",
        category: "Strings",
        starter_code: {
            javascript: "function countVowels(s) {\n  // Your code here\n}",
            python: "def count_vowels(s):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "hello world", expected: "3" },
            { input: "aeiou", expected: "5" }
        ]
    },
    {
        title: "Array Sum",
        description: "Calculate the sum of all elements in an array. Example: [1,2,3,4,5] returns 15",
        difficulty: "easy",
        category: "Arrays",
        starter_code: {
            javascript: "function arraySum(arr) {\n  // Your code here\n}",
            python: "def array_sum(arr):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,2,3,4,5]", expected: "15" },
            { input: "[-1,1,0]", expected: "0" }
        ]
    },
    {
        title: "FizzBuzz",
        description: "Return 'Fizz' if n is divisible by 3, 'Buzz' if divisible by 5, 'FizzBuzz' if divisible by both, otherwise return the number as string",
        difficulty: "easy",
        category: "Math",
        starter_code: {
            javascript: "function fizzBuzz(n) {\n  // Your code here\n}",
            python: "def fizz_buzz(n):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "15", expected: "FizzBuzz" },
            { input: "9", expected: "Fizz" },
            { input: "10", expected: "Buzz" }
        ]
    },
    {
        title: "Remove Duplicates",
        description: "Remove duplicate elements from an array while maintaining order. Example: [1,2,2,3,3,4] becomes [1,2,3,4]",
        difficulty: "easy",
        category: "Arrays",
        starter_code: {
            javascript: "function removeDuplicates(arr) {\n  // Your code here\n}",
            python: "def remove_duplicates(arr):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,2,2,3,3,4]", expected: "[1,2,3,4]" },
            { input: "[1,1,1]", expected: "[1]" }
        ]
    },
    {
        title: "Binary Search",
        description: "Implement binary search to find target in sorted array. Return index if found, -1 otherwise. Example: [1,3,5,7,9], target=5 returns 2",
        difficulty: "medium",
        category: "Arrays",
        starter_code: {
            javascript: "function binarySearch(arr, target) {\n  // Your code here\n}",
            python: "def binary_search(arr, target):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,3,5,7,9], 5", expected: "2" },
            { input: "[1,3,5,7,9], 4", expected: "-1" }
        ]
    },
    {
        title: "Merge Sorted Arrays",
        description: "Merge two sorted arrays into one sorted array. Example: [1,3,5] + [2,4,6] = [1,2,3,4,5,6]",
        difficulty: "medium",
        category: "Arrays",
        starter_code: {
            javascript: "function mergeSorted(arr1, arr2) {\n  // Your code here\n}",
            python: "def merge_sorted(arr1, arr2):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,3,5], [2,4,6]", expected: "[1,2,3,4,5,6]" },
            { input: "[1], [2,3,4]", expected: "[1,2,3,4]" }
        ]
    },
    {
        title: "Valid Parentheses",
        description: "Check if a string of parentheses is valid. Valid means every opening bracket has a matching closing bracket in correct order. Example: '()[]{}' is valid",
        difficulty: "medium",
        category: "Stacks",
        starter_code: {
            javascript: "function isValid(s) {\n  // Your code here\n}",
            python: "def is_valid(s):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "()[]{}", expected: "true" },
            { input: "([)]", expected: "false" }
        ]
    },
    {
        title: "First Non-Repeating Character",
        description: "Find the first character in a string that does not repeat. Example: 'leetcode' returns 'l'",
        difficulty: "medium",
        category: "Hash Tables",
        starter_code: {
            javascript: "function firstUnique(s) {\n  // Your code here\n}",
            python: "def first_unique(s):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "leetcode", expected: "l" },
            { input: "aabb", expected: "" }
        ]
    },
    {
        title: "Longest Substring Without Repeating",
        description: "Find length of longest substring without repeating characters. Example: 'abcabcbb' has longest 'abc' with length 3",
        difficulty: "medium",
        category: "Sliding Window",
        starter_code: {
            javascript: "function lengthOfLongestSubstring(s) {\n  // Your code here\n}",
            python: "def length_of_longest_substring(s):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "abcabcbb", expected: "3" },
            { input: "bbbbb", expected: "1" }
        ]
    },
    {
        title: "Rotate Array",
        description: "Rotate array to the right by k steps. Example: [1,2,3,4,5] rotated by 2 becomes [4,5,1,2,3]",
        difficulty: "medium",
        category: "Arrays",
        starter_code: {
            javascript: "function rotate(arr, k) {\n  // Your code here\n}",
            python: "def rotate(arr, k):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,2,3,4,5], 2", expected: "[4,5,1,2,3]" },
            { input: "[1,2,3], 1", expected: "[3,1,2]" }
        ]
    },
    {
        title: "Fibonacci Number",
        description: "Calculate the nth Fibonacci number. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). Example: F(6) = 8",
        difficulty: "easy",
        category: "Dynamic Programming",
        starter_code: {
            javascript: "function fib(n) {\n  // Your code here\n}",
            python: "def fib(n):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "6", expected: "8" },
            { input: "10", expected: "55" }
        ]
    },
    {
        title: "Climbing Stairs",
        description: "You can climb 1 or 2 steps at a time. How many distinct ways to climb n stairs? Example: n=3 has 3 ways",
        difficulty: "easy",
        category: "Dynamic Programming",
        starter_code: {
            javascript: "function climbStairs(n) {\n  // Your code here\n}",
            python: "def climb_stairs(n):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "3", expected: "3" },
            { input: "5", expected: "8" }
        ]
    },
    {
        title: "Reverse Linked List",
        description: "Reverse a singly linked list. Given 1->2->3->4->5, return 5->4->3->2->1",
        difficulty: "medium",
        category: "Linked Lists",
        starter_code: {
            javascript: "function reverseList(head) {\n  // Your code here\n}",
            python: "def reverse_list(head):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]" },
            { input: "[1,2]", expected: "[2,1]" }
        ]
    },
    {
        title: "Maximum Subarray",
        description: "Find the contiguous subarray with the largest sum. Example: [-2,1,-3,4,-1,2,1,-5,4] has max sum 6 from [4,-1,2,1]",
        difficulty: "medium",
        category: "Dynamic Programming",
        starter_code: {
            javascript: "function maxSubArray(nums) {\n  // Your code here\n}",
            python: "def max_sub_array(nums):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" },
            { input: "[1]", expected: "1" }
        ]
    },
    {
        title: "Contains Duplicate",
        description: "Return true if any value appears at least twice in array. Example: [1,2,3,1] returns true",
        difficulty: "easy",
        category: "Hash Tables",
        starter_code: {
            javascript: "function containsDuplicate(nums) {\n  // Your code here\n}",
            python: "def contains_duplicate(nums):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "[1,2,3,1]", expected: "true" },
            { input: "[1,2,3,4]", expected: "false" }
        ]
    },
    {
        title: "Anagram Check",
        description: "Check if two strings are anagrams (same characters, different order). Example: 'listen' and 'silent' are anagrams",
        difficulty: "easy",
        category: "Strings",
        starter_code: {
            javascript: "function isAnagram(s, t) {\n  // Your code here\n}",
            python: "def is_anagram(s, t):\n    # Your code here\n    pass"
        },
        test_cases: [
            { input: "listen, silent", expected: "true" },
            { input: "rat, car", expected: "false" }
        ]
    }
];

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const count = Math.min(body.count || 5, 20); // Max 20 at a time

        // Get existing challenges for this user
        const { data: existingChallenges } = await supabase
            .from("coding_challenges")
            .select("title")
            .eq("user_id", user.id);

        const existingTitles = new Set((existingChallenges || []).map(c => c.title));

        // Filter out challenges user already has
        const availableChallenges = CHALLENGE_LIBRARY.filter(
            c => !existingTitles.has(c.title)
        );

        if (availableChallenges.length === 0) {
            return NextResponse.json({
                message: "All challenges already generated",
                generated: 0,
                total: existingChallenges?.length || 0,
            });
        }

        // Select random challenges to add
        const toGenerate = Math.min(count, availableChallenges.length);
        const shuffled = availableChallenges.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, toGenerate);

        const generatedChallenges = [];

        for (const challenge of selected) {
            const { data, error } = await supabase
                .from("coding_challenges")
                .insert({
                    user_id: user.id,
                    title: challenge.title,
                    description: challenge.description,
                    difficulty: challenge.difficulty,
                    category: challenge.category,
                    starter_code: challenge.starter_code,
                    test_cases: challenge.test_cases,
                    is_recommended: true,
                })
                .select()
                .single();

            if (!error && data) {
                generatedChallenges.push(data);
            }
        }

        return NextResponse.json({
            generated: generatedChallenges.length,
            total: (existingChallenges?.length || 0) + generatedChallenges.length,
            challenges: generatedChallenges,
        });

    } catch (error: any) {
        console.error("Bulk generate error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
