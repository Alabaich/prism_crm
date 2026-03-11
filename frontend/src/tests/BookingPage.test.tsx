import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingPage from './BookingPage'; // Adjust import to your path
import { format } from 'date-fns';

// Mock the Fetch API so our component thinks the backend responded
global.fetch = jest.fn(() =>
Promise.resolve({
ok: true,
json: () => Promise.resolve([]), // Return empty taken slots/blocked dates
})
) as jest.Mock;

describe('BookingPage Date & Time Scenarios', () => {

beforeEach(() => {
jest.clearAllMocks();
});

test('SCENARIO 1: Saturday 16:00 is disabled, but 15:00 is available', async () => {
render(<BookingPage />);

// 1. Find the date select dropdown
const dateSelect = screen.getByRole('combobox');

// 2. Find a Saturday in the dropdown options
const saturdayOption = Array.from(dateSelect.querySelectorAll('option'))
  .find(opt => opt.text.includes('Sat'));
  
if (!saturdayOption) throw new Error("Could not find a Saturday to test!");

// 3. Select that Saturday
fireEvent.change(dateSelect, { target: { value: saturdayOption.value } });

// Wait for the slots to re-render
await waitFor(() => {
  const btn1600 = screen.getByText('16:00');
  const btn1500 = screen.getByText('15:00');
  
  // ASSERTIONS:
  // The 16:00 button MUST be disabled on Saturdays
  expect(btn1600).toBeDisabled();
  // The 15:00 button MUST be enabled on Saturdays
  expect(btn1500).not.toBeDisabled();
});


});

test('SCENARIO 2: Booking Summary (Step 2) shows the correct local date without shifting', async () => {
render(<BookingPage />);

// Pick ANY valid date (e.g., March 14, 2026)
const dateSelect = screen.getByRole('combobox');
const targetOption = dateSelect.querySelectorAll('option')[5]; // Pick 5 days from now
const selectedDateString = targetOption.value; // e.g. "2026-03-14"

fireEvent.change(dateSelect, { target: { value: selectedDateString } });

// Pick a valid time slot to enable the Continue button
await waitFor(() => {
  // Find the first available button that isn't 16:00 (just to be safe)
  const timeBtns = screen.getAllByRole('button').filter(b => !b.disabled && b.textContent !== '16:00');
  fireEvent.click(timeBtns[0]);
});

// Click Continue to Details
fireEvent.click(screen.getByText('Continue to Details'));

// We are now on Step 2. Verify the Booking Summary text.
await waitFor(() => {
  // Calculate what the string SHOULD say based on local timezone 
  const [year, month, day] = selectedDateString.split('-').map(Number);
  const expectedDateText = format(new Date(year, month - 1, day), "MMMM d, yyyy");
  
  // ASSERTION: The summary must contain the EXACT text (e.g. "March 14, 2026")
  // If the UTC bug existed, this would render "March 13, 2026"
  expect(screen.getByText(new RegExp(expectedDateText, 'i'))).toBeInTheDocument();
});


});

test('SCENARIO 3: Past times on the current day are disabled', async () => {
// We mock the system time to 1:30 PM (13:30) for this test
jest.useFakeTimers().setSystemTime(new Date('2026-03-10T13:30:00Z'));

render(<BookingPage />);

// Since today is selected by default, wait for buttons
await waitFor(() => {
  const btn1200 = screen.getByText('12:00');
  const btn1300 = screen.getByText('13:00');
  const btn1400 = screen.getByText('14:00');

  // ASSERTIONS:
  // 12:00 and 13:00 are in the past/current hour, should be disabled
  expect(btn1200).toBeDisabled();
  expect(btn1300).toBeDisabled();
  // 14:00 is in the future, should be enabled
  expect(btn1400).not.toBeDisabled();
});

jest.useRealTimers();


});
});