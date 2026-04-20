def calculate_average(numbers):
    total = 0
    
    for i in range(len(numbers)):
        total += numbers[i]
    
    avg = total / len(numbers)
    return avg


def find_max(numbers):
    max = 0
    
    for num in numbers:
        if num > max:
            max = num
    
    return max


nums = []

print("Average:", calculate_average(nums))
print("Max:", find_max(nums))