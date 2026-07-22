package content

import (
	"math"
	"testing"
)

func TestCalculateTaxUsesIntegerMinorUnitsWithoutOverflow(t *testing.T) {
	tests := []struct {
		name    string
		gross   int64
		percent int32
		want    int64
	}{
		{name: "VN ten percent", gross: 500000, percent: 10, want: 50000},
		{name: "PH floors fractional minor unit", gross: 100001, percent: 8, want: 8000},
		{name: "maximum int64 at one hundred percent", gross: math.MaxInt64, percent: 100, want: math.MaxInt64},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := calculateTax(test.gross, test.percent)
			if err != nil {
				t.Fatalf("calculateTax() error = %v", err)
			}
			if got != test.want {
				t.Fatalf("calculateTax() = %d, want %d", got, test.want)
			}
		})
	}
}

func TestCalculateTaxRejectsInvalidConfig(t *testing.T) {
	if _, err := calculateTax(100, 101); err == nil {
		t.Fatal("calculateTax() accepted tax above 100 percent")
	}
}
