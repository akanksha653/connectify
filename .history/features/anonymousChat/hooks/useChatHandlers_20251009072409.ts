const handleMatched = useCallback(
  (data: any) => {
    console.log("✅ Matched:", data);

    const {
      roomId,
      isOfferer,
      partnerId,
      partnerName,
      partnerAge,
      partnerCountry,
    } = data;

    setRoomId(roomId);
    setIsOfferer(isOfferer);

    setPartnerInfo({
      uid: partnerId,
      name: partnerName || "Stranger",
      age: partnerAge || "",
      gender: "", // optional if not sent
      country: partnerCountry || "",
      email: "",
    });

    setLoading(false);
    setLastAction(null);
    playSound("match");
  },
  [playSound, setRoomId, setIsOfferer, setPartnerInfo, setLoading, setLastAction]
);
