using OpenAI.Chat;

namespace InnoviaHub.Api.Assistant;

public static class AssistantTools
{
    public const string GetAvailability = "get_availability";
    public const string ProposeBooking = "propose_booking";

    public static readonly ChatTool GetAvailabilityTool = ChatTool.CreateFunctionTool(
        functionName: GetAvailability,
        functionDescription:
          "Hämtar lediga tider för alla aktiva resurser en viss dag. " +
          "Returnerar resursens id, namn, typ, antal platser och lediga intervall i svensk tid.",
        functionParameters: BinaryData.FromString("""
            {
              "type": "object",
              "properties": {
                "date":        { "type": "string",  "description": "Datum i formatet YYYY-MM-DD" },
                "minCapacity": { "type": "integer", "description": "Minsta antal platser resursen måste ha" }
              },
              "required": ["date"]
            }
            """));

    public static readonly ChatTool ProposeBookingTool = ChatTool.CreateFunctionTool(
        functionName: ProposeBooking,
        functionDescription:
          "Skapar ett bokningsförslag som kunden sedan bekräftar med en knapp. " +
          "Använd när kunden har valt resurs, datum, starttid och sluttid. " +
          "Bokar INTE direkt. Returnerar ett fel om tiden inte går att boka.",
        functionParameters: BinaryData.FromString("""
            {
              "type": "object",
              "properties": {
                "resourceId": { "type": "string", "description": "Resursens id från get_availability" },
                "date":       { "type": "string", "description": "Datum i formatet YYYY-MM-DD" },
                "startTime":  { "type": "string", "description": "Starttid i svensk tid, formatet HH:mm" },
                "endTime":    { "type": "string", "description": "Sluttid i svensk tid, formatet HH:mm" }
              },
              "required": ["resourceId", "date", "startTime", "endTime"]
            }
            """));
}