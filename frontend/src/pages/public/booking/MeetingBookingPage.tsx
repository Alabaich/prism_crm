import { useParams } from "react-router-dom";
import BookingPage from "./BookingPage";

const MeetingBookingPage = () => {
  const { token } = useParams<{ token: string }>();
  return <BookingPage bookingType="meeting" meetingToken={token} />;
};

export default MeetingBookingPage;