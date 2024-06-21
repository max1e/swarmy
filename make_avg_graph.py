import numpy as np
import matplotlib.pyplot as plt

# List of files to read
files = [
    'escapedParticlesHistoryBase.txt',
    'escapedParticlesHistory2.txt',
    'escapedParticlesHistoryLarge.txt',
    'escapedParticlesHistorySmall.txt',
    'escapedParticlesHistoryWall.txt'
]

# Dictionary to store the data from each file
all_escaped_data = {}

for file_name in files:
    with open(file_name) as file:
        escaped_all_runs = []
        for line in file:
            escaped_single_run = [float(particle) for particle in line.strip().split(',') if float(particle) != float('inf')]
            escaped_all_runs.append(escaped_single_run)
        all_escaped_data[file_name] = escaped_all_runs

# Find the maximum length of the runs
max_length = max(len(run) for runs in all_escaped_data.values() for run in runs)

# Prepare to plot averages
plt.figure(figsize=(12, 8))

# Process and plot average data for each file
for file_name, escaped_all_runs in all_escaped_data.items():
    all_runs_padded = np.full((len(escaped_all_runs), max_length), 195)

    # Copy each run into all_runs_padded
    for i, run in enumerate(escaped_all_runs):
        all_runs_padded[i, :len(run)] = run

    # Compute and plot the average
    average = np.mean(all_runs_padded, axis=0)
    plt.plot(average, label=f'Average {file_name}', linewidth=2)

# Add labels and title
plt.xlabel('Time Step')
plt.ylabel('Particles escaped')
plt.title('Particles escaped over time')

# Add legend
plt.legend()

# Show plot
plt.show()
