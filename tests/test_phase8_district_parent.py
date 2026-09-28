import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.district_admin_pipeline import DistrictAdminPipeline


def test_phase8_district_parent_pipeline():
    pipeline = DistrictAdminPipeline()

    concept_code = "EVS-G3-WAT-01"

    # 1. Test Remedial Pathway Generation
    pathway = pipeline.generate_remedial_pathway(
        student_id="student_sukru_08",
        student_name="Sukru Gond",
        concept_code=concept_code,
        weak_bloom_level="Understand",
        target_language="hi",
    )
    assert pathway is not None
    assert pathway.pathway_id != ""
    assert len(pathway.steps) == 4
    assert pathway.status == "ASSIGNED"
    print(f"\nRemedial Pathway Generated: {pathway.pathway_id}")
    for s in pathway.steps:
        print(f"  Step {s.step_number} [{s.step_type}]: {s.title} -> {s.instruction[:60]}...")

    # 2. Test Parent Voice Advisory Generation (IVR / WhatsApp Audio Note)
    advisory = pipeline.send_parent_voice_advisory(
        student_id="student_sukru_08",
        student_name="Sukru Gond",
        parent_phone="+91-9876543210",
        concept_code=concept_code,
        target_language="hi",
        target_dialect="gon",
    )
    assert advisory is not None
    assert advisory.advisory_id != ""
    assert Path(advisory.audio_file_path).exists()
    assert advisory.dispatch_status == "SENT"
    print(f"\nParent Voice Advisory Generated: {advisory.advisory_id}")
    print(f"  - Parent Phone: {advisory.parent_phone}")
    print(f"  - Speech Script:\n{advisory.speech_script}")
    print(f"  - Audio File: {Path(advisory.audio_file_path).name}")

    # 3. Test Pending Interventions List
    pending = pipeline.get_pending_interventions()
    assert len(pending) >= 1
    assert any(p["student_id"] == "student_sukru_08" for p in pending)
    print(f"\nPending Interventions Queue: {len(pending)} active remedial pathways.")

    # 4. Test District Overview Analytics
    overview = pipeline.get_district_overview()
    assert overview is not None
    assert "CG-BASTAR" in overview["district_code"]
    assert overview["total_assessments_completed"] >= 1
    print(f"\nDistrict Analytics Overview:")
    print(f"  - District: {overview['district_code']} ({overview['state_name']})")
    print(f"  - Average Score: {overview['district_average_score_pct']}%")
    print(f"  - Active Remedials: {overview['active_remedial_pathways']}")
    print(f"  - Priority Gap: {overview['learning_gap_priority']}")


if __name__ == "__main__":
    test_phase8_district_parent_pipeline()
    print("\nPhase 8 District Admin & Parent Voice Advisory Pipeline Tests Passed!")
