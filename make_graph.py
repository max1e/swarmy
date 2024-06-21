# -*- coding: utf-8 -*-
"""
Created on Thu Mar 14 11:12:25 2024

@author: rik
"""
import numpy as np
import matplotlib.pyplot as plt

with open('escapedParticlesHistory.txt') as file:
    escaped_all_runs = []
    
    for line in file:
        escaped_single_run = [float(particle) for particle in line.strip().split(',') if float(particle) != float('inf')]
        escaped_all_runs.append(escaped_single_run)
   

max_length = max(len(run) for run in escaped_all_runs)

all_runs_padded = np.full((len(escaped_all_runs), max_length), 195)

# Copy each run into padded_data
for i, run in enumerate(escaped_all_runs):
    all_runs_padded[i, :len(run)] = run

for i in range(len(escaped_all_runs)):
    plt.plot(all_runs_padded[i], color='blue', alpha=0.2)
    
average = np.mean(all_runs_padded, axis=0)
plt.plot(average, color='orange', label='Average', linewidth=2)

# Add labels and title
plt.xlabel('Time Step')
plt.ylabel('Particles escaped')
plt.title('Particles escaped over time - Wall')

# Add legend
plt.legend()

# Show plot
plt.show()