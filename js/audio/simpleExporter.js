// Simple Audio Exporter - Python version approach
// Generates samples directly and applies filters via FFT

class SimpleAudioExporter {
    constructor() {
        this.isExporting = false;
        
        // Export settings (matching Python defaults)
        this.exportSettings = {
            enableNormalization: true,
            normalizeValue: 0.5,  // Python default
            exportAmplitude: 1.0,  // Separate from UI master gain
            enableFadeIn: true,   // Python default
            enableFadeOut: true,  // Python default
            fadeInDuration: 0.001,  // 1ms default (Python default)
            fadeOutDuration: 0.001, // 1ms default (Python default)
            fadeInPower: 2.0,     // Python default
            fadeOutPower: 2.0,    // Python default
            fadeBeforeNorm: false // Default to "Normalize then Fade" (Python default)
        };
    }

    /**
     * Normalize signal to target amplitude (like Python AudioNormalizer.normalize_signal)
     * @param {Float32Array} signal - Input signal
     * @param {number} targetAmplitude - Target amplitude (default 0.5 like Python)
     * @returns {Float32Array} Normalized signal
     */
    normalizeSignal(signal, targetAmplitude = 0.5) {
        console.log('🎵 NORMALIZE: Input max level:', Math.max(...signal.map(Math.abs)));
        console.log('🎵 NORMALIZE: Target amplitude:', targetAmplitude);
        
        // Get the maximum absolute value
        const maxAbs = Math.max(...signal.map(Math.abs));
        
        if (maxAbs === 0) {
            console.log('🎵 NORMALIZE: Signal is silent, returning unchanged');
            return signal;
        }
        
        // First normalize to [-1,1] range, then scale to target amplitude
        const normalizedSignal = new Float32Array(signal.length);
        const scaleFactor = targetAmplitude / maxAbs;
        
        for (let i = 0; i < signal.length; i++) {
            normalizedSignal[i] = signal[i] * scaleFactor;
        }
        
        console.log('🎵 NORMALIZE: Output max level:', Math.max(...normalizedSignal.map(Math.abs)));
        return normalizedSignal;
    }

    /**
     * Export current configuration using simple approach (like Python version)
     * @param {number} durationSeconds - Duration in seconds
     * @param {Object} trackConfig - Track configuration from trackManager
     * @param {Object} exportSettings - Export-specific settings (optional)
     * @returns {Promise<Float32Array>} Rendered audio data
     */
    async exportSimple(durationSeconds, trackConfig, exportSettings = {}) {
        console.log('🎵 SIMPLE EXPORT: Starting with duration:', durationSeconds, 'seconds');
        
        // Merge export settings
        const settings = { ...this.exportSettings, ...exportSettings };
        console.log('🎵 SIMPLE EXPORT: Export settings:', settings);
        
        const sampleRate = settings.exportSampleRate || 44100;  // Configurable sample rate
        const totalSamples = Math.floor(durationSeconds * sampleRate);
        
        console.log('🎵 SIMPLE EXPORT: Sample rate:', sampleRate, 'Hz');
        console.log('🎵 SIMPLE EXPORT: Duration:', durationSeconds, 'seconds');
        console.log('🎵 SIMPLE EXPORT: Total samples needed:', totalSamples);
        console.log('🎵 SIMPLE EXPORT: Calculation:', durationSeconds, '×', sampleRate, '=', totalSamples);
        
        // Initialize mix buffer
        let mixedData = new Float32Array(totalSamples);
        
        // Process each track and mix them together
        if (trackConfig.tracks && trackConfig.tracks.length > 0) {
            console.log('🎵 SIMPLE EXPORT: Processing', trackConfig.tracks.length, 'tracks');
            
            for (let trackIndex = 0; trackIndex < trackConfig.tracks.length; trackIndex++) {
                const track = trackConfig.tracks[trackIndex];
                
                if (!track.enabled) {
                    console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'disabled, skipping');
                    continue;
                }
                
                console.log('🎵 SIMPLE EXPORT: Processing track', trackIndex);
                
                // Generate white noise for this track
                const trackNoise = this.generateWhiteNoise(totalSamples);
                console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'generated noise, max level:', Math.max(...trackNoise.map(Math.abs)));
                
                // Apply filters to this track
                let trackData = trackNoise;
                
                if (track.filters && track.filters.length > 0) {
                    console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'applying', track.filters.length, 'filters');
                    
                    for (let i = 0; i < track.filters.length; i++) {
                        const filter = track.filters[i];
                        if (filter.enabled) {
                            console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'applying filter:', filter.type, 'gain:', filter.gain, 'dB', 'centerFreq:', filter.centerFreq, 'Hz');
                            trackData = this.applyFilterFFT(trackData, filter, sampleRate);
                            console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'after filter, max level:', Math.max(...trackData.map(Math.abs)));
                        }
                    }
                }
                
                // Apply track gain
                if (track.gain !== undefined && track.gain !== 1.0) {
                    const trackGainLinear = typeof track.gain === 'number' && track.gain > 0 && track.gain < 10
                        ? track.gain  // Already linear
                        : Math.pow(10, (track.gain || 0) / 20);  // Convert dB to linear
                    
                    console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'applying track gain:', trackGainLinear);
                    trackData = trackData.map(sample => sample * trackGainLinear);
                }
                
                // Mix this track into the final mix
                for (let i = 0; i < totalSamples; i++) {
                    mixedData[i] += trackData[i];
                }
                
                console.log('🎵 SIMPLE EXPORT: Track', trackIndex, 'mixed, current mix max level:', Math.max(...mixedData.map(Math.abs)));
            }
        } else {
            console.log('🎵 SIMPLE EXPORT: No tracks configured, generating single white noise');
            // Fallback: generate single white noise if no tracks
            mixedData = this.generateWhiteNoise(totalSamples);
        }
        
        console.log('🎵 SIMPLE EXPORT: Final mixed data, max level:', Math.max(...mixedData.map(Math.abs)));
        
        // Apply export-specific amplitude (like Python version)
        if (settings.exportAmplitude !== 1.0) {
            console.log('🎵 SIMPLE EXPORT: Applying export amplitude:', settings.exportAmplitude);
            mixedData = mixedData.map(sample => sample * settings.exportAmplitude);
        }

        // Calculate fade samples
        const fadeInSamples = settings.enableFadeIn ? 
            Math.floor(settings.fadeInDuration * sampleRate) : 0;
        const fadeOutSamples = settings.enableFadeOut ? 
            Math.floor(settings.fadeOutDuration * sampleRate) : 0;
        
        console.log('🎵 FADE CALC: Fade-in duration:', settings.fadeInDuration, 'seconds');
        console.log('🎵 FADE CALC: Fade-out duration:', settings.fadeOutDuration, 'seconds');
        console.log('🎵 FADE CALC: Fade-in samples:', fadeInSamples, '(' + settings.fadeInDuration + ' × ' + sampleRate + ')');
        console.log('🎵 FADE CALC: Fade-out samples:', fadeOutSamples, '(' + settings.fadeOutDuration + ' × ' + sampleRate + ')');

        // Apply fade and normalization in the correct order (matching Python version)
        if (settings.fadeBeforeNorm) {
            console.log('🎵 SIMPLE EXPORT: Processing order: Fade then Normalize');
            
            // Apply fades first
            if (fadeInSamples > 0 || fadeOutSamples > 0) {
                console.log('🎵 SIMPLE EXPORT: Applying fades...');
                mixedData = this.applyFadeEnvelope(
                    mixedData, fadeInSamples, fadeOutSamples,
                    settings.fadeInPower, settings.fadeOutPower
                );
            }
            
            // Then normalize
            if (settings.enableNormalization) {
                console.log('🎵 SIMPLE EXPORT: Applying normalization...');
                mixedData = this.normalizeSignal(mixedData, settings.normalizeValue);
            }
        } else {
            console.log('🎵 SIMPLE EXPORT: Processing order: Normalize then Fade');
            
            // Normalize first
            if (settings.enableNormalization) {
                console.log('🎵 SIMPLE EXPORT: Applying normalization...');
                mixedData = this.normalizeSignal(mixedData, settings.normalizeValue);
            }
            
            // Then apply fades
            if (fadeInSamples > 0 || fadeOutSamples > 0) {
                console.log('🎵 SIMPLE EXPORT: Applying fades...');
                mixedData = this.applyFadeEnvelope(
                    mixedData, fadeInSamples, fadeOutSamples,
                    settings.fadeInPower, settings.fadeOutPower
                );
            }
        }
        
        console.log('🎵 SIMPLE EXPORT: Final result, length:', mixedData.length, 'samples, max level:', Math.max(...mixedData.map(Math.abs)));
        
        return new Float32Array(mixedData);
    }

    /**
     * Generate white noise samples directly (no AudioWorklet)
     * @param {number} numSamples - Number of samples to generate
     * @returns {Float32Array} White noise samples
     */
    generateWhiteNoise(numSamples) {
        const samples = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            // Generate white noise: random values between -1 and 1
            samples[i] = (Math.random() - 0.5) * 2.0;
        }
        return samples;
    }

    /**
     * Apply filter using FFT approach (like Python version)
     * @param {Float32Array} data - Input audio data
     * @param {Object} filter - Filter configuration
     * @param {number} sampleRate - Sample rate
     * @returns {Float32Array} Filtered audio data
     */
    applyFilterFFT(data, filter, sampleRate) {
        console.log('🎵 FFT FILTER: Applying', filter.type, 'filter to', data.length, 'samples');
        
        // For now, implement plateau filter (most common in our tests)
        if (filter.type === 'plateau') {
            return this.applyPlateauFilter(data, filter, sampleRate);
        }
        
        // For other filters, return data unchanged for now
        console.log('🎵 FFT FILTER: Filter type', filter.type, 'not implemented yet, returning unchanged');
        return data;
    }

    /**
     * Apply plateau filter using FFT (Python-style)
     * @param {Float32Array} data - Input audio data
     * @param {Object} filter - Plateau filter configuration
     * @param {number} sampleRate - Sample rate
     * @returns {Float32Array} Filtered audio data
     */
    applyPlateauFilter(data, filter, sampleRate) {
        console.log('🎵 PLATEAU FILTER: centerFreq:', filter.centerFreq, 'width:', filter.width, 'gain:', filter.gain, 'dB');
        console.log('🎵 PLATEAU FILTER: Input data length:', data.length, 'samples');
        
        // Create FFT-friendly size (power of 2)
        const fftSize = Math.pow(2, Math.ceil(Math.log2(data.length)));
        console.log('🎵 PLATEAU FILTER: Original size:', data.length, 'FFT size:', fftSize);
        
        // Pad data to FFT size
        const paddedData = new Float32Array(fftSize);
        paddedData.set(data);
        console.log('🎵 PLATEAU FILTER: Padded data length:', paddedData.length, 'samples');
        
        // Convert to complex numbers for FFT
        const complexData = new Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            complexData[i] = [paddedData[i], 0]; // [real, imaginary]
        }
        
        // Apply FFT
        const spectrum = this.fft(complexData);
        console.log('🎵 PLATEAU FILTER: FFT spectrum length:', spectrum.length, 'bins');
        
        // Create frequency mask (plateau shape)
        const mask = this.createPlateauMask(fftSize, filter.centerFreq, filter.width, filter.flatWidth, sampleRate);
        
        // Convert filter gain from dB to linear
        const gainLinear = Math.pow(10, (filter.gain || 0) / 20);
        console.log('🎵 PLATEAU FILTER: Gain linear:', gainLinear, '(from', filter.gain, 'dB)');
        
        // Apply filter mask with gain
        for (let i = 0; i < fftSize; i++) {
            const maskValue = mask[i] * gainLinear;
            spectrum[i][0] *= maskValue; // real part
            spectrum[i][1] *= maskValue; // imaginary part
        }
        
        // Apply inverse FFT
        const filteredComplex = this.ifft(spectrum);
        console.log('🎵 PLATEAU FILTER: IFFT result length:', filteredComplex.length, 'samples');
        
        // Convert back to real values and trim to original size
        const result = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = filteredComplex[i][0]; // Take real part
        }
        
        console.log('🎵 PLATEAU FILTER: Output data length:', result.length, 'samples (trimmed from', filteredComplex.length, ')');
        console.log('🎵 PLATEAU FILTER: Expected length:', data.length, 'samples');
        
        return result;
    }

    /**
     * Create plateau frequency mask (improved to match Python version)
     * @param {number} fftSize - FFT size
     * @param {number} centerFreq - Center frequency in Hz
     * @param {number} width - Total filter width in Hz
     * @param {number} flatWidth - Flat section width in Hz
     * @param {number} sampleRate - Sample rate
     * @returns {Float32Array} Frequency mask
     */
    createPlateauMask(fftSize, centerFreq, width, flatWidth = width * 0.5, sampleRate) {
        const mask = new Float32Array(fftSize);
        
        for (let i = 0; i < fftSize; i++) {
            // Calculate frequency for this bin (handle positive and negative frequencies)
            const freq = i <= fftSize / 2 
                ? (i * sampleRate) / fftSize 
                : ((i - fftSize) * sampleRate) / fftSize;
            
            // Calculate distance from center frequency
            const freqDiff = Math.abs(freq - centerFreq);
            
            // Plateau filter logic (matching Python version)
            if (freqDiff < flatWidth / 2) {
                // Flat plateau region
                mask[i] = 1.0;
            } else if (freqDiff <= width / 2) {
                // Cosine rolloff from plateau to zero
                const rolloffDistance = freqDiff - flatWidth / 2;
                const rolloffRange = width / 2 - flatWidth / 2;
                
                if (rolloffRange > 0) {
                    const rolloffPosition = rolloffDistance / rolloffRange;
                    mask[i] = 0.5 * (1 + Math.cos(Math.PI * rolloffPosition));
                } else {
                    mask[i] = 1.0; // No rolloff range
                }
            } else {
                // Outside filter width
                mask[i] = 0.0;
            }
        }
        
        console.log('🎵 PLATEAU MASK: Created mask, active bins:', mask.filter(v => v > 0).length, '/', fftSize);
        return mask;
    }

    /**
     * Simple FFT implementation (Cooley-Tukey)
     * @param {Array} x - Complex input array [[real, imag], ...]
     * @returns {Array} Complex output array
     */
    fft(x) {
        const N = x.length;
        if (N <= 1) return x;
        
        // Divide
        const even = this.fft(x.filter((_, i) => i % 2 === 0));
        const odd = this.fft(x.filter((_, i) => i % 2 === 1));
        
        // Combine
        const combined = new Array(N);
        for (let k = 0; k < N / 2; k++) {
            const angle = -2 * Math.PI * k / N;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Complex multiplication: odd[k] * e^(-2πik/N)
            const tReal = cos * odd[k][0] - sin * odd[k][1];
            const tImag = cos * odd[k][1] + sin * odd[k][0];
            
            combined[k] = [even[k][0] + tReal, even[k][1] + tImag];
            combined[k + N/2] = [even[k][0] - tReal, even[k][1] - tImag];
        }
        
        return combined;
    }

    /**
     * Inverse FFT
     * @param {Array} X - Complex input array
     * @returns {Array} Complex output array
     */
    ifft(X) {
        // Conjugate the complex numbers
        const conjugated = X.map(([real, imag]) => [real, -imag]);
        
        // Apply FFT
        const result = this.fft(conjugated);
        
        // Conjugate and normalize
        return result.map(([real, imag]) => [real / X.length, -imag / X.length]);
    }

    /**
     * Apply cosine fade envelope to signal (like Python AudioExporter.apply_envelope)
     * @param {Float32Array} signal - Input signal
     * @param {number} fadeInSamples - Number of fade-in samples
     * @param {number} fadeOutSamples - Number of fade-out samples
     * @param {number} fadeInPower - Fade-in power curve (default 2.0)
     * @param {number} fadeOutPower - Fade-out power curve (default 2.0)
     * @returns {Float32Array} Signal with fade envelope applied
     */
    applyFadeEnvelope(signal, fadeInSamples, fadeOutSamples, fadeInPower = 2.0, fadeOutPower = 2.0) {
        console.log('🎵 FADE: Applying fade envelope');
        console.log('🎵 FADE: Input max level:', Math.max(...signal.map(Math.abs)));
        console.log('🎵 FADE: Fade-in samples:', fadeInSamples, 'Fade-out samples:', fadeOutSamples);
        
        if (fadeInSamples <= 0 && fadeOutSamples <= 0) {
            console.log('🎵 FADE: No fade requested, returning unchanged');
            return signal;
        }
        
        const result = new Float32Array(signal.length);
        
        // Validate fade lengths don't exceed signal length
        const totalFade = fadeInSamples + fadeOutSamples;
        if (totalFade >= signal.length) {
            console.log('🎵 FADE: Warning - fade lengths exceed signal length, adjusting');
            const scaleFactor = (signal.length - 1) / totalFade;
            fadeInSamples = Math.floor(fadeInSamples * scaleFactor);
            fadeOutSamples = Math.floor(fadeOutSamples * scaleFactor);
        }
        
        for (let i = 0; i < signal.length; i++) {
            let envelope = 1.0;
            
            // Apply fade-in
            if (i < fadeInSamples) {
                const t = i / fadeInSamples;  // 0 to 1
                envelope = Math.pow(0.5 * (1 - Math.cos(Math.PI * t)), fadeInPower);
            }
            // Apply fade-out
            else if (i >= signal.length - fadeOutSamples) {
                const t = (signal.length - 1 - i) / fadeOutSamples;  // 1 to 0
                envelope = Math.pow(0.5 * (1 - Math.cos(Math.PI * t)), fadeOutPower);
            }
            
            result[i] = signal[i] * envelope;
        }
        
        console.log('🎵 FADE: Output max level:', Math.max(...result.map(Math.abs)));
        return result;
    }

    /**
     * Create WAV blob from audio data
     * @param {Float32Array} audioData - Audio samples
     * @param {number} sampleRate - Sample rate
     * @returns {Blob} WAV file blob
     */
    createWavBlob(audioData, sampleRate) {
        const length = audioData.length;
        console.log('🎵 WAV CREATION: Input audio data length:', length, 'samples');
        console.log('🎵 WAV CREATION: Sample rate:', sampleRate, 'Hz');
        console.log('🎵 WAV CREATION: Duration:', length / sampleRate, 'seconds');
        
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        console.log('🎵 WAV CREATION: WAV header data chunk size:', length * 2, 'bytes');
        console.log('🎵 WAV CREATION: Total file size:', 44 + length * 2, 'bytes');
        
        // Audio data
        const offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset + i * 2, sample * 0x7FFF, true);
        }
        
        console.log('🎵 WAV CREATION: Audio data written:', length, 'samples');
        
        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Download WAV file
     * @param {Blob} blob - WAV blob
     * @param {string} filename - Filename
     */
    downloadWav(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export for use in other modules
window.SimpleAudioExporter = SimpleAudioExporter; 