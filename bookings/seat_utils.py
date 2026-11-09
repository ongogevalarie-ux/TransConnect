
def generate_seat_numbers(capacity):
    """Generate four seats per row: A1, A2, A3, A4, B1, etc."""
    seats = []

    for index in range(capacity):
        row_number = index // 4
        seat_position = (index % 4) + 1

        # Convert row number into spreadsheet-style letters.
        label = ""
        number = row_number + 1

        while number:
            number, remainder = divmod(number - 1, 26)
            label = chr(65 + remainder) + label

        seats.append(f"{label}{seat_position}")

    return seats
